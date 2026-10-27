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

        // 1. Ensure Default Admin Exists
        UserEntity admin;
        Optional<UserEntity> adminOpt = userRepository.findByUsername("admin");
        if (adminOpt.isEmpty()) {
            System.out.println("[+] Creating default admin user in nexus_rpa_db...");
            admin = new UserEntity();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin = userRepository.save(admin);
        } else {
            admin = adminOpt.get();
            if (!admin.getPassword().startsWith("$2a$")) {
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin = userRepository.save(admin);
            }
        }

        // 2. Link any orphan templates to admin
        List<TemplateEntity> orphanTemplates = templateRepository.findByUserIsNull();
        if (!orphanTemplates.isEmpty()) {
            for (TemplateEntity t : orphanTemplates) {
                t.setUser(admin);
            }
            templateRepository.saveAll(orphanTemplates);
        }

        // 3. Scan PostgreSQL server for any existing templates
        deepScanAllDatabasesForTemplates(admin);

        // 4. Seed Kyntus Core Templates & Sub-Macros if they were lost prior to DB setup
        seedCoreKyntusTemplatesIfMissing(admin);

        System.out.println("[✓] Database Seeder Ready. Total templates for admin: " + templateRepository.count());
    }

    private void seedCoreKyntusTemplatesIfMissing(UserEntity admin) {
        Set<String> existingNames = templateRepository.findAll().stream()
                .map(t -> t.getName().trim().toLowerCase())
                .collect(Collectors.toSet());

        // 1. Taux_Racc
        if (!existingNames.contains("taux_racc")) {
            createPresetTemplate(admin, "Taux_Racc", List.of(
                    step(0, "ACTION", null, null, 2.0, "OPEN_CHROME", "start chrome --incognito --start-maximized \"https://mig-dashboard.kyntus.fr/\""),
                    step(1, "ACTION", null, null, 3.0, "SMART_MIG_LOGIN_OR_SKIP", "robot:scraperrobot"),
                    step(2, "CLICK", 340, 220, 2.0, null, null),
                    step(3, "ACTION", null, null, 2.5, "PROC_OPEN_DOWNLOAD", null),
                    step(4, "ACTION", null, null, 3.0, "PROC_EXTRACT_EXCEL", null),
                    step(5, "ACTION", null, null, 1.5, "SAVE_CLIPBOARD_TO_CSV", "{\"folder\":\"C:\\\\Nexus_Data\",\"filename\":\"Taux_Racc.csv\"}")
            ));
        }

        // 2. Benchmark
        if (!existingNames.contains("benchmark")) {
            createPresetTemplate(admin, "Benchmark", List.of(
                    step(0, "ACTION", null, null, 2.0, "OPEN_CHROME", "start chrome --incognito --start-maximized \"https://mig-dashboard.kyntus.fr/\""),
                    step(1, "ACTION", null, null, 3.0, "SMART_MIG_LOGIN_OR_SKIP", "robot:scraperrobot"),
                    step(2, "CLICK", 520, 220, 2.0, null, null),
                    step(3, "ACTION", null, null, 2.5, "PROC_OPEN_DOWNLOAD", null),
                    step(4, "ACTION", null, null, 3.0, "PROC_EXTRACT_EXCEL", null),
                    step(5, "ACTION", null, null, 1.5, "SAVE_CLIPBOARD_TO_CSV", "{\"folder\":\"C:\\\\Nexus_Data\",\"filename\":\"Benchmark.csv\"}")
            ));
        }

        // 3. SATCLI_Export
        if (!existingNames.contains("satcli_export")) {
            createPresetTemplate(admin, "SATCLI_Export", List.of(
                    step(0, "ACTION", null, null, 2.0, "FOCUS_WINDOW", "Citrix"),
                    step(1, "ACTION", null, null, 1.5, "FORCE_MAXIMIZE_FRENCH", null),
                    step(2, "CLICK", 640, 360, 2.0, null, null),
                    step(3, "ACTION", null, null, 2.0, "CTRL_A", null),
                    step(4, "ACTION", null, null, 2.0, "CTRL_C", null),
                    step(5, "ACTION", null, null, 1.5, "SAVE_CLIPBOARD_TO_CSV", "{\"folder\":\"C:\\\\Nexus_Data\",\"filename\":\"SATCLI_Export.csv\"}")
            ));
        }

        // 4. PROC_EXTRACT_EXCEL (Sub-Macro)
        if (!existingNames.contains("proc_extract_excel")) {
            createPresetTemplate(admin, "PROC_EXTRACT_EXCEL", List.of(
                    step(0, "ACTION", null, null, 1.5, "WIN_UP", null),
                    step(1, "ACTION", null, null, 1.0, "ESC", null),
                    step(2, "ACTION", null, null, 1.0, "CTRL_HOME", null),
                    step(3, "ACTION", null, null, 1.5, "CTRL_A", null),
                    step(4, "ACTION", null, null, 3.0, "CTRL_C", null),
                    step(5, "ACTION", null, null, 1.5, "ALT_F4", null),
                    step(6, "ACTION", null, null, 1.0, "HANDLE_EXCEL_CLIPBOARD_PROMPT", null)
            ));
        }

        // 5. PROC_OPEN_DOWNLOAD (Sub-Macro)
        if (!existingNames.contains("proc_open_download")) {
            createPresetTemplate(admin, "PROC_OPEN_DOWNLOAD", List.of(
                    step(0, "ACTION", null, null, 2.0, "PROC_OPEN_DOWNLOAD", null),
                    step(1, "ACTION", null, null, 2.0, "ENTER", null)
            ));
        }

        // 6. PROC_CLEAR_CACHE (Sub-Macro)
        if (!existingNames.contains("proc_clear_cache")) {
            createPresetTemplate(admin, "PROC_CLEAR_CACHE", List.of(
                    step(0, "ACTION", null, null, 2.0, "PROC_CLEAR_CACHE", null),
                    step(1, "ACTION", null, null, 1.5, "PROC_HARD_RELOAD", null)
            ));
        }
    }

    private StepEntity step(int order, String type, Integer x, Integer y, double delay, String action, String param) {
        StepEntity s = new StepEntity();
        s.setOrderIndex(order);
        s.setType(type);
        s.setXCoordinate(x);
        s.setYCoordinate(y);
        s.setDelay(delay);
        s.setActionName(action);
        s.setParameter(param);
        return s;
    }

    private void createPresetTemplate(UserEntity admin, String name, List<StepEntity> steps) {
        TemplateEntity t = new TemplateEntity();
        t.setName(name);
        t.setUser(admin);
        t.setSteps(new ArrayList<>(steps));
        templateRepository.save(t);
        System.out.println("   [+] Restored Core Template: " + name);
    }

    private void deepScanAllDatabasesForTemplates(UserEntity admin) {
        Set<String> existingNames = templateRepository.findAll().stream()
                .map(t -> t.getName().trim().toLowerCase())
                .collect(Collectors.toSet());

        String[][] serversToScan = {
                {"jdbc:postgresql://10.10.10.50:5432/", "kyntus_user", "kyntus_password"},
                {"jdbc:postgresql://localhost:5432/", "postgres", "postgres"},
                {"jdbc:postgresql://localhost:5432/", "kyntus_user", "kyntus_password"}
        };

        for (String[] srv : serversToScan) {
            String baseUrl = srv[0];
            String dbUser = srv[1];
            String dbPass = srv[2];

            List<String> databaseNames = new ArrayList<>();
            try (Connection rootConn = DriverManager.getConnection(baseUrl + "postgres", dbUser, dbPass);
                 PreparedStatement ps = rootConn.prepareStatement(
                         "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('nexus_rpa_db')")) {
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        databaseNames.add(rs.getString("datname"));
                    }
                }
            } catch (Exception ignored) {
                continue;
            }

            for (String dbName : databaseNames) {
                scanSingleDatabase(baseUrl + dbName, dbUser, dbPass, dbName, admin, existingNames);
            }
        }
    }

    private void scanSingleDatabase(String fullJdbcUrl, String dbUser, String dbPass, String dbName, UserEntity admin, Set<String> existingNames) {
        try (Connection conn = DriverManager.getConnection(fullJdbcUrl, dbUser, dbPass)) {
            boolean hasTemplatesTable;
            try (PreparedStatement checkPs = conn.prepareStatement(
                    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates'")) {
                try (ResultSet rs = checkPs.executeQuery()) {
                    hasTemplatesTable = rs.next();
                }
            }
            if (!hasTemplatesTable) return;

            String selectTemplatesSql = "SELECT id, name FROM templates ORDER BY id ASC";
            try (PreparedStatement psT = conn.prepareStatement(selectTemplatesSql);
                 ResultSet rsT = psT.executeQuery()) {

                while (rsT.next()) {
                    long oldId = rsT.getLong("id");
                    String rawName = rsT.getString("name");
                    if (rawName == null || rawName.trim().isEmpty()) continue;

                    String finalName = rawName.trim();
                    if (existingNames.contains(finalName.toLowerCase())) continue;

                    List<StepEntity> stepsList = new ArrayList<>();
                    String selectStepsSql = "SELECT order_index, type, x_coordinate, y_coordinate, delay, action_name, parameter " +
                            "FROM steps WHERE template_id = ? ORDER BY order_index ASC";

                    try (PreparedStatement psS = conn.prepareStatement(selectStepsSql)) {
                        psS.setLong(1, oldId);
                        try (ResultSet rsS = psS.executeQuery()) {
                            int idx = 0;
                            while (rsS.next()) {
                                StepEntity step = new StepEntity();
                                int orderIdx = rsS.getInt("order_index");
                                step.setOrderIndex(rsS.wasNull() ? idx : orderIdx);
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
                                idx++;
                            }
                        }
                    }

                    TemplateEntity newTemplate = new TemplateEntity();
                    newTemplate.setName(finalName);
                    newTemplate.setUser(admin);
                    newTemplate.setSteps(stepsList);

                    templateRepository.save(newTemplate);
                    existingNames.add(finalName.toLowerCase());
                }
            }
        } catch (Exception ignored) {}
    }
}