package com.nexus.RPA.service;

import org.springframework.stereotype.Component;

import java.awt.*;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.StringSelection;
import java.io.File;
import java.io.FileWriter;
import java.util.Arrays;
import java.util.Comparator;

@Component
public class RpaContextManager {

    private String currentLoopFile = "";
    private String lastSavedFilePath = "";

    // Context Mother Destination
    private String motherFolderPath = "C:\\Nexus_Data";
    private String motherFileName = "Data_Output.csv";

    public String getCurrentLoopFile() {
        return currentLoopFile;
    }

    public void setCurrentLoopFile(String currentLoopFile) {
        this.currentLoopFile = currentLoopFile;
    }

    public String getLastSavedFilePath() {
        return lastSavedFilePath;
    }

    public void setLastSavedFilePath(String lastSavedFilePath) {
        this.lastSavedFilePath = lastSavedFilePath;
    }

    public String getMotherFolderPath() {
        return motherFolderPath;
    }

    public void setMotherFolderPath(String motherFolderPath) {
        this.motherFolderPath = motherFolderPath;
    }

    public String getMotherFileName() {
        return motherFileName;
    }

    public void setMotherFileName(String motherFileName) {
        this.motherFileName = motherFileName;
    }

    public String getFullMotherFilePath() {
        String folder = this.motherFolderPath != null ? this.motherFolderPath.trim() : "C:\\Nexus_Data";
        String file = this.motherFileName != null ? this.motherFileName.trim() : "Data_Output.csv";
        if (!file.endsWith(".csv")) file += ".csv";
        if (folder.endsWith("\\") || folder.endsWith("/")) {
            return folder + file;
        } else {
            return folder + File.separator + file;
        }
    }

    public void ensureClipboardCleared() {
        Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
        for (int i = 0; i < 10; i++) {
            try {
                clipboard.setContents(new StringSelection(""), null);
                Thread.sleep(100);
                if (!clipboard.isDataFlavorAvailable(DataFlavor.stringFlavor)) {
                    return;
                }
                String current = (String) clipboard.getData(DataFlavor.stringFlavor);
                if (current == null || current.isEmpty()) {
                    return;
                }
            } catch (Exception e) {}
            try { Thread.sleep(150); } catch (Exception e) {}
        }
    }

    public String safeGetClipboardData() {
        Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
        for (int i = 0; i < 15; i++) {
            try {
                if (clipboard.isDataFlavorAvailable(DataFlavor.stringFlavor)) {
                    String data = (String) clipboard.getData(DataFlavor.stringFlavor);
                    if (data != null && !data.trim().isEmpty()) {
                        return data;
                    }
                }
            } catch (Exception e) {}
            try { Thread.sleep(1200); } catch (Exception e) {}
        }
        return "";
    }

    public void saveClipboardToFile(String folderPath, String customFileName) {
        try {
            String data = safeGetClipboardData();
            if (data == null || data.trim().isEmpty()) {
                System.err.println("[-] Clipboard is empty! Nothing to save.");
                return;
            }

            data = data.replace("\t", ";");

            File dir = new File(folderPath);
            if (!dir.exists()) dir.mkdirs();

            String fileName = customFileName;
            if (!fileName.endsWith(".csv")) fileName += ".csv";

            File file = new File(dir, fileName);
            FileWriter writer = new FileWriter(file);
            writer.write(data);
            writer.close();

            this.lastSavedFilePath = file.getAbsolutePath();
            System.out.println("[+] File successfully created at: " + this.lastSavedFilePath);
        } catch (Exception ex) {
            System.err.println("[-] Failed to save clipboard data: " + ex.getMessage());
        }
    }

    public void detectLatestFileInDirectory(String folderPath) {
        try {
            File dir = new File(folderPath);
            if (!dir.exists() || !dir.isDirectory()) return;

            File[] files = dir.listFiles(File::isFile);
            if (files == null || files.length == 0) return;

            Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());

            for (File f : files) {
                String name = f.getName().toLowerCase();
                if (!name.endsWith(".tmp") && !name.endsWith(".crdownload") && !name.startsWith("~$")) {
                    this.lastSavedFilePath = f.getAbsolutePath();
                    System.out.println("[+] Detected Latest File: " + this.lastSavedFilePath);
                    break;
                }
            }
        } catch (Exception e) {}
    }
}