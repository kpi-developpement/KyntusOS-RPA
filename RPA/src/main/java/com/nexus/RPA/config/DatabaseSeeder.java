package com.nexus.RPA.config;

import com.nexus.RPA.entity.StepEntity;
import com.nexus.RPA.entity.TemplateEntity;
import com.nexus.RPA.entity.UserEntity;
import com.nexus.RPA.repository.TemplateRepository;
import com.nexus.RPA.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TemplateRepository templateRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, TemplateRepository templateRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.templateRepository = templateRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println("[+] Starting Nexus Data Migration & Seeding...");

        // 1. Ensure Default Admin Exists
        UserEntity admin = userRepository.findByUsername("admin").orElseGet(() -> {
            UserEntity newAdmin = new UserEntity();
            newAdmin.setUsername("admin");
            newAdmin.setPassword(passwordEncoder.encode("admin123"));
            newAdmin.setRole("ADMIN");
            return userRepository.save(newAdmin);
        });

        // 2. MIGRATE OLD DATA (Users & Templates) FROM LOCAL PC (10.10.10.50) OR OLD SERVER
        migrateOldData(admin);

        System.out.println("[✓] Migration Complete. Total Users: " + userRepository.count() + " | Total Templates: " + templateRepository.count());
    }

    private void migrateOldData(UserEntity admin) {
        // We will scan both the local PC (where you worked before) and the server itself
        String[][] oldDatabases = {
                {"jdbc:postgresql://10.10.10.50:5432/kyntus_db", "kyntus_user", "kyntus_password"},
                {"jdbc:postgresql://10.10.10.50:5432/postgres", "postgres", "postgres"},
                {"jdbc:postgresql://10.10.10.25:5454/kyntus_db", "kyntus_user", "kyntus_password"}
        };

        Set<String> existingUsers = userRepository.findAll().stream()
                .map(u -> u.getUsername().toLowerCase())
                .collect(Collectors.toSet());

        Set<String> existingTemplates = templateRepository.findAll().stream()
                .map(t -> t.getName().toLowerCase())
                .collect(Collectors.toSet());

        for (String[] dbConfig : oldDatabases) {
            String url = dbConfig[0];
            String user = dbConfig[1];
            String pass = dbConfig[2];

            try (Connection conn = DriverManager.getConnection(url, user, pass)) {
                System.out.println("[*] Connected to old DB for migration: " + url);

                // --- MIGRATE USERS ---
                try (PreparedStatement psU = conn.prepareStatement("SELECT * FROM users");
                     ResultSet rsU = psU.executeQuery()) {
                    while (rsU.next()) {
                        String oldUsername = rsU.getString("username");
                        if (oldUsername != null && !existingUsers.contains(oldUsername.toLowerCase())) {
                            UserEntity newUser = new UserEntity();
                            newUser.setUsername(oldUsername);
                            newUser.setPassword(rsU.getString("password")); // Keep old hashed password
                            newUser.setRole(rsU.getString("role"));
                            userRepository.save(newUser);
                            existingUsers.add(oldUsername.toLowerCase());
                            System.out.println("   [+] Migrated User: " + oldUsername);
                        }
                    }
                } catch (Exception e) {
                    System.out.println("   [-] No users table found in " + url);
                }

                // --- MIGRATE TEMPLATES ---
                try (PreparedStatement psT = conn.prepareStatement("SELECT * FROM templates ORDER BY id ASC");
                     ResultSet rsT = psT.executeQuery()) {
                    while (rsT.next()) {
                        long oldId = rsT.getLong("id");
                        String tName = rsT.getString("name");
                        if (tName == null || existingTemplates.contains(tName.toLowerCase())) continue;

                        // Try to map to the correct owner
                        long oldUserId = rsT.getLong("user_id");
                        UserEntity owner = admin;
                        if (!rsT.wasNull()) {
                            // Find username of old user to link to new user
                            try (PreparedStatement psOwner = conn.prepareStatement("SELECT username FROM users WHERE id = ?")) {
                                psOwner.setLong(1, oldUserId);
                                try (ResultSet rsOwner = psOwner.executeQuery()) {
                                    if (rsOwner.next()) {
                                        String ownerName = rsOwner.getString("username");
                                        owner = userRepository.findByUsername(ownerName).orElse(admin);
                                    }
                                }
                            }
                        }

                        // Fetch Steps
                        List<StepEntity> stepsList = new ArrayList<>();
                        try (PreparedStatement psS = conn.prepareStatement("SELECT * FROM steps WHERE template_id = ? ORDER BY order_index ASC")) {
                            psS.setLong(1, oldId);
                            try (ResultSet rsS = psS.executeQuery()) {
                                while (rsS.next()) {
                                    StepEntity step = new StepEntity();
                                    step.setOrderIndex(rsS.getInt("order_index"));
                                    step.setType(rsS.getString("type") != null ? rsS.getString("type") : "ACTION");

                                    int x = rsS.getInt("x_coordinate");
                                    if (!rsS.wasNull()) step.setXCoordinate(x);

                                    int y = rsS.getInt("y_coordinate");
                                    if (!rsS.wasNull()) step.setYCoordinate(y);

                                    double delay = rsS.getDouble("delay");
                                    step.setDelay(rsS.wasNull() ? 1.0 : delay);

                                    step.setActionName(rsS.getString("action_name"));
                                    step.setParameter(rsS.getString("parameter"));
                                    stepsList.add(step);
                                }
                            }
                        }

                        TemplateEntity newTemplate = new TemplateEntity();
                        newTemplate.setName(tName);
                        newTemplate.setUser(owner);
                        newTemplate.setSteps(stepsList);
                        templateRepository.save(newTemplate);
                        existingTemplates.add(tName.toLowerCase());
                        System.out.println("   [+] Migrated Template: " + tName + " (Owner: " + owner.getUsername() + ")");
                    }
                } catch (Exception e) {
                    System.out.println("   [-] No templates table found in " + url);
                }

            } catch (Exception ignored) {
                // DB not reachable, skip silently
            }
        }
    }
}