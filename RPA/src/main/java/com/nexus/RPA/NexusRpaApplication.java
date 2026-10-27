package com.nexus.RPA;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@SpringBootApplication
public class NexusRpaApplication {
    public static void main(String[] args) {
        // 7yedna headless="false" bach y-khdem f Docker (Linux) bla machakil
        ensureDedicatedDatabaseExists();
        SpringApplication.run(NexusRpaApplication.class, args);
    }

    private static void ensureDedicatedDatabaseExists() {
        String pgBaseUrl = "jdbc:postgresql://10.10.10.25:5454/postgres";
        String user = "kyntus_user";
        String pass = "kyntus_password";
        String targetDb = "nexus_rpa_db";

        try (Connection conn = DriverManager.getConnection(pgBaseUrl, user, pass);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT 1 FROM pg_database WHERE datname = '" + targetDb + "'");
            if (!rs.next()) {
                System.out.println("[⚡] Creating dedicated database '" + targetDb + "' on PostgreSQL server...");
                stmt.executeUpdate("CREATE DATABASE " + targetDb);
                System.out.println("[✓] Database '" + targetDb + "' created successfully!");
            }
        } catch (Exception e) {
            System.out.println("[i] Database check note: " + e.getMessage());
        }
    }
}