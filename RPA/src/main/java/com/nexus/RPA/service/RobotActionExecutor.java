package com.nexus.RPA.service;

import org.springframework.stereotype.Component;

import java.awt.*;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.StringSelection;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;

@Component
public class RobotActionExecutor {

    private Robot robot;
    private final RpaContextManager contextManager;

    public RobotActionExecutor(RpaContextManager contextManager) {
        this.contextManager = contextManager;
        try {
            this.robot = new Robot();
            this.robot.setAutoDelay(15);
        } catch (AWTException e) {
            System.err.println("Failed to initialize Robot: " + e.getMessage());
        }
    }

    public void mouseClick(int x, int y) {
        robot.mouseMove(x, y);
        robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
        sleep(60);
        robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
    }

    public void pasteText(String text) {
        try {
            StringSelection stringSelection = new StringSelection(text);
            Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            clipboard.setContents(stringSelection, null);

            sleep(250);

            robot.keyPress(KeyEvent.VK_CONTROL);
            sleep(50);
            robot.keyPress(KeyEvent.VK_V);
            sleep(100);
            robot.keyRelease(KeyEvent.VK_V);
            robot.keyRelease(KeyEvent.VK_CONTROL);
            sleep(150);
        } catch (Exception e) {
            System.err.println("Failed to paste text: " + e.getMessage());
        }
    }

    public void typeKeyboardDirect(String text) {
        if (text == null) return;
        for (char c : text.toCharArray()) {
            int keyCode = KeyEvent.getExtendedKeyCodeForChar(c);
            if (KeyEvent.CHAR_UNDEFINED == keyCode) {
                pasteText(String.valueOf(c));
                continue;
            }

            boolean isUpper = Character.isUpperCase(c);
            if (isUpper) {
                robot.keyPress(KeyEvent.VK_SHIFT);
                sleep(20);
            }

            try {
                robot.keyPress(keyCode);
                sleep(30);
                robot.keyRelease(keyCode);
                sleep(30);
            } catch (Exception e) {
                pasteText(String.valueOf(c));
            }

            if (isUpper) {
                robot.keyRelease(KeyEvent.VK_SHIFT);
                sleep(20);
            }
        }
    }

    public void focusWindowOS(String titleKeyword) {
        try {
            System.out.println("[*] Attempting OS Focus on window matching: " + titleKeyword);
            String psCommand = "$w = Get-Process | Where-Object { $_.MainWindowTitle -like '*" + titleKeyword + "*' } | Select-Object -First 1; " +
                    "if ($w) { $wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate($w.Id) }";
            ProcessBuilder pb = new ProcessBuilder("powershell", "-NoProfile", "-NonInteractive", "-Command", psCommand);
            pb.start();
            sleep(600);
        } catch (Exception e) {
            System.err.println("[-] Failed to focus window: " + e.getMessage());
        }
    }

    // =========================================================================
    // FIX COMPLEET: ALT+SPACE -> 5x FLÈCHE BAS -> ENTER -> ESCAPE DE SÉCURITÉ
    // =========================================================================
    public void forceMaximizeFrenchWindow() {
        System.out.println("[🪟] Executing Force Maximize (Alt+Space -> 5x Down -> Enter)...");

        // 1. T-t2kked bli makayn 7ta modifier m-cliki f Windows
        robot.keyRelease(KeyEvent.VK_ALT);
        robot.keyRelease(KeyEvent.VK_CONTROL);
        robot.keyRelease(KeyEvent.VK_SHIFT);
        sleep(100);

        // 2. Alt + Space bash t7ell l-menu système
        robot.keyPress(KeyEvent.VK_ALT);
        sleep(70);
        robot.keyPress(KeyEvent.VK_SPACE);
        sleep(120);
        robot.keyRelease(KeyEvent.VK_SPACE);
        sleep(50);
        robot.keyRelease(KeyEvent.VK_ALT);

        // Délai darouri bash Windows y-dessini l-menu mzyan w y-lâchi l'état dyal Alt
        sleep(450);

        // 3. Parcourir 5 fois b Sahm l-te7t b ryatme nqi
        for (int i = 1; i <= 5; i++) {
            robot.keyPress(KeyEvent.VK_DOWN);
            sleep(60);
            robot.keyRelease(KeyEvent.VK_DOWN);
            sleep(90);
        }

        // 4. Valider b Entrée
        robot.keyPress(KeyEvent.VK_ENTER);
        sleep(100);
        robot.keyRelease(KeyEvent.VK_ENTER);

        // Délai bash l-fenêtre t-kber w t-mchi l-menu
        sleep(500);

        // 5. SAFETY NET: Ila bqat l-menu m3llqa, had l-Escape kay-ferg3ha f l-blasa
        // bash ma t-bloquich l-focus dyal Tab w l-User/Password !
        robot.keyPress(KeyEvent.VK_ESCAPE);
        sleep(50);
        robot.keyRelease(KeyEvent.VK_ESCAPE);
        sleep(200);

        System.out.println("[+] Maximize sequence completed and menu dismissed.");
    }

    public void handleExcelClipboardPrompt() {
        System.out.println("[📋] Checking for Excel Clipboard large data prompt...");
        sleep(500);
        robot.keyPress(KeyEvent.VK_ENTER);
        sleep(80);
        robot.keyRelease(KeyEvent.VK_ENTER);
        sleep(300);
        robot.keyPress(KeyEvent.VK_N);
        sleep(80);
        robot.keyRelease(KeyEvent.VK_N);
        sleep(300);
    }

    public void handleSmartMigLogin(String customCredentials) {
        String username = "robot";
        String password = "scraperrobot";

        if (customCredentials != null && customCredentials.contains(":")) {
            String[] parts = customCredentials.split(":");
            username = parts[0].trim();
            password = parts[1].trim();
        }

        System.out.println("[🔍] Checking browser screen state for Login form...");

        mouseClick(150, 150);
        sleep(300);

        contextManager.ensureClipboardCleared();
        sleep(200);

        robot.keyPress(KeyEvent.VK_CONTROL); sleep(40);
        robot.keyPress(KeyEvent.VK_A); sleep(80);
        robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
        sleep(250);

        robot.keyPress(KeyEvent.VK_CONTROL); sleep(40);
        robot.keyPress(KeyEvent.VK_C); sleep(150);
        robot.keyRelease(KeyEvent.VK_C); robot.keyRelease(KeyEvent.VK_CONTROL);
        sleep(300);

        String pageContent = contextManager.safeGetClipboardData().toLowerCase();

        if (pageContent.contains("votre connexion n'est pas priv") ||
                pageContent.contains("err_cert") ||
                pageContent.contains("pirates informatiques")) {

            System.out.println("[⚠️] SSL Warning Screen Detected! Typing 'thisisunsafe' bypass code...");
            robot.keyPress(KeyEvent.VK_ESCAPE); sleep(100); robot.keyRelease(KeyEvent.VK_ESCAPE);
            sleep(300);

            typeKeyboardDirect("thisisunsafe");
            sleep(4000);

            mouseClick(150, 150);
            sleep(300);
            contextManager.ensureClipboardCleared();
            robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_A);
            robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
            sleep(200);
            robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_C);
            robot.keyRelease(KeyEvent.VK_C); robot.keyRelease(KeyEvent.VK_CONTROL);
            sleep(300);
            pageContent = contextManager.safeGetClipboardData().toLowerCase();
        }

        robot.keyPress(KeyEvent.VK_ESCAPE); sleep(80); robot.keyRelease(KeyEvent.VK_ESCAPE);
        sleep(300);

        boolean isLoginPage = pageContent.contains("admin") ||
                pageContent.contains("connexion") ||
                pageContent.contains("login") ||
                pageContent.contains("mot de passe") ||
                pageContent.contains("password") ||
                pageContent.contains("se connecter");

        if (isLoginPage) {
            System.out.println("[🔐] Login form detected! Typing Username & Password...");

            Dimension screenSize = Toolkit.getDefaultToolkit().getScreenSize();
            int centerX = screenSize.width / 2;
            int centerY = (screenSize.height / 2) - 30;

            mouseClick(centerX, centerY);
            sleep(300);

            robot.keyPress(KeyEvent.VK_CONTROL); sleep(30);
            robot.keyPress(KeyEvent.VK_A); sleep(50);
            robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
            sleep(80);
            robot.keyPress(KeyEvent.VK_BACK_SPACE); sleep(50); robot.keyRelease(KeyEvent.VK_BACK_SPACE);
            sleep(150);

            pasteText(username);
            sleep(400);

            robot.keyPress(KeyEvent.VK_TAB); sleep(80); robot.keyRelease(KeyEvent.VK_TAB);
            sleep(300);

            mouseClick(centerX, centerY + 58);
            sleep(300);

            robot.keyPress(KeyEvent.VK_CONTROL); sleep(30);
            robot.keyPress(KeyEvent.VK_A); sleep(50);
            robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
            sleep(80);
            robot.keyPress(KeyEvent.VK_BACK_SPACE); sleep(50); robot.keyRelease(KeyEvent.VK_BACK_SPACE);
            sleep(150);

            pasteText(password);
            sleep(500);

            robot.keyPress(KeyEvent.VK_ENTER); sleep(120); robot.keyRelease(KeyEvent.VK_ENTER);
            System.out.println("[+] Credentials entered successfully! Waiting 5s for dashboard loading...");
            sleep(5000);
        } else {
            System.out.println("[⚡] Already logged in to MIG Dashboard! Skipping login steps.");
            sleep(1000);
        }
    }

    public void executeSpecialAction(String actionName) {
        if (actionName == null) return;
        switch (actionName.toUpperCase()) {
            case "MAXIMIZE_WINDOW":
            case "FORCE_MAXIMIZE_FRENCH":
                forceMaximizeFrenchWindow();
                break;
            case "HANDLE_EXCEL_CLIPBOARD_PROMPT":
                handleExcelClipboardPrompt();
                break;
            case "OPEN_CHROME":
                try {
                    Runtime.getRuntime().exec(new String[]{"cmd", "/c", "start chrome --ignore-certificate-errors"});
                } catch (Exception e) {}
                sleep(3000);
                break;
            case "CTRL_SHIFT_N":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(40);
                robot.keyPress(KeyEvent.VK_SHIFT); sleep(40);
                robot.keyPress(KeyEvent.VK_N); sleep(120);
                robot.keyRelease(KeyEvent.VK_N);
                robot.keyRelease(KeyEvent.VK_SHIFT);
                robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(1500);
                break;
            case "ALT_TAB":
                robot.keyPress(KeyEvent.VK_ALT); sleep(80);
                robot.keyPress(KeyEvent.VK_TAB); sleep(120);
                robot.keyRelease(KeyEvent.VK_TAB); sleep(80);
                robot.keyRelease(KeyEvent.VK_ALT);
                sleep(800);
                break;
            case "CTRL_W":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(40);
                robot.keyPress(KeyEvent.VK_W); sleep(100);
                robot.keyRelease(KeyEvent.VK_W);
                robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(600);
                break;
            case "CTRL_SHIFT_W":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(40);
                robot.keyPress(KeyEvent.VK_SHIFT); sleep(40);
                robot.keyPress(KeyEvent.VK_W); sleep(100);
                robot.keyRelease(KeyEvent.VK_W);
                robot.keyRelease(KeyEvent.VK_SHIFT);
                robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(800);
                break;
            case "CTRL_A":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(50);
                robot.keyPress(KeyEvent.VK_A); sleep(100);
                robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
                break;
            case "CTRL_C":
                contextManager.ensureClipboardCleared();
                sleep(300);

                robot.keyPress(KeyEvent.VK_CONTROL); sleep(50);
                robot.keyPress(KeyEvent.VK_C); sleep(250);
                robot.keyRelease(KeyEvent.VK_C); robot.keyRelease(KeyEvent.VK_CONTROL);

                System.out.println("[*] Waiting for fresh clipboard data after Ctrl+C...");
                for (int i = 0; i < 20; i++) {
                    try {
                        Clipboard cb = Toolkit.getDefaultToolkit().getSystemClipboard();
                        if (cb.isDataFlavorAvailable(DataFlavor.stringFlavor)) {
                            String content = (String) cb.getData(DataFlavor.stringFlavor);
                            if (content != null && !content.trim().isEmpty()) {
                                System.out.println("[+] Fresh data acquired in clipboard (" + content.length() + " chars)");
                                break;
                            }
                        }
                    } catch (Exception e) {}
                    sleep(500);
                }
                break;
            case "CTRL_V":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(50);
                robot.keyPress(KeyEvent.VK_V); sleep(100);
                robot.keyRelease(KeyEvent.VK_V); robot.keyRelease(KeyEvent.VK_CONTROL);
                break;
            case "CTRL_L":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(50);
                robot.keyPress(KeyEvent.VK_L); sleep(100);
                robot.keyRelease(KeyEvent.VK_L); robot.keyRelease(KeyEvent.VK_CONTROL);
                break;
            case "CTRL_HOME":
                robot.keyPress(KeyEvent.VK_CONTROL); sleep(50);
                robot.keyPress(KeyEvent.VK_HOME); sleep(100);
                robot.keyRelease(KeyEvent.VK_HOME); robot.keyRelease(KeyEvent.VK_CONTROL);
                break;
            case "TAB":
                robot.keyPress(KeyEvent.VK_TAB); sleep(80); robot.keyRelease(KeyEvent.VK_TAB);
                sleep(150);
                break;
            case "ENTER":
                robot.keyPress(KeyEvent.VK_ENTER); sleep(100); robot.keyRelease(KeyEvent.VK_ENTER);
                sleep(200);
                break;
            case "ESC":
                robot.keyPress(KeyEvent.VK_ESCAPE); sleep(100); robot.keyRelease(KeyEvent.VK_ESCAPE);
                break;
            case "WIN_UP":
                robot.keyPress(KeyEvent.VK_WINDOWS); sleep(50);
                robot.keyPress(KeyEvent.VK_UP); sleep(100);
                robot.keyRelease(KeyEvent.VK_UP); robot.keyRelease(KeyEvent.VK_WINDOWS);
                break;
            case "ALT_F4":
                robot.keyPress(KeyEvent.VK_ALT); sleep(50);
                robot.keyPress(KeyEvent.VK_F4); sleep(100);
                robot.keyRelease(KeyEvent.VK_F4); robot.keyRelease(KeyEvent.VK_ALT);
                break;
            case "TYPE_N":
                robot.keyPress(KeyEvent.VK_N); sleep(100); robot.keyRelease(KeyEvent.VK_N);
                break;
            case "DOUBLE_CLICK":
                robot.mousePress(InputEvent.BUTTON1_DOWN_MASK); robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
                sleep(100);
                robot.mousePress(InputEvent.BUTTON1_DOWN_MASK); robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
                break;
            case "PROC_OPEN_DOWNLOAD":
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_J);
                robot.keyRelease(KeyEvent.VK_J); robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(2000);
                robot.keyPress(KeyEvent.VK_ENTER); robot.keyRelease(KeyEvent.VK_ENTER);
                break;
            case "PROC_EXTRACT_EXCEL":
                robot.keyPress(KeyEvent.VK_WINDOWS); robot.keyPress(KeyEvent.VK_UP);
                robot.keyRelease(KeyEvent.VK_UP); robot.keyRelease(KeyEvent.VK_WINDOWS);
                sleep(1500);
                robot.keyPress(KeyEvent.VK_ESCAPE); robot.keyRelease(KeyEvent.VK_ESCAPE);
                sleep(1000);
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_HOME);
                robot.keyRelease(KeyEvent.VK_HOME); robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(1000);
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_A);
                robot.keyRelease(KeyEvent.VK_A); robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(1500);

                contextManager.ensureClipboardCleared();
                robot.keyPress(KeyEvent.VK_CONTROL);
                robot.keyPress(KeyEvent.VK_C);
                robot.keyRelease(KeyEvent.VK_C);
                robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(5000);

                robot.keyPress(KeyEvent.VK_ALT); robot.keyPress(KeyEvent.VK_F4);
                robot.keyRelease(KeyEvent.VK_F4); robot.keyRelease(KeyEvent.VK_ALT);
                sleep(1000);
                handleExcelClipboardPrompt();
                break;
            case "PROC_CLEAR_CACHE":
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_SHIFT); robot.keyPress(KeyEvent.VK_DELETE);
                robot.keyRelease(KeyEvent.VK_DELETE); robot.keyRelease(KeyEvent.VK_SHIFT); robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(2000);
                robot.keyPress(KeyEvent.VK_ENTER); robot.keyRelease(KeyEvent.VK_ENTER);
                break;
            case "PROC_SAVE_AS_PDF":
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_P);
                robot.keyRelease(KeyEvent.VK_P); robot.keyRelease(KeyEvent.VK_CONTROL);
                sleep(2000);
                robot.keyPress(KeyEvent.VK_ENTER); robot.keyRelease(KeyEvent.VK_ENTER);
                break;
            case "PROC_HARD_RELOAD":
                robot.keyPress(KeyEvent.VK_CONTROL); robot.keyPress(KeyEvent.VK_F5);
                robot.keyRelease(KeyEvent.VK_F5); robot.keyRelease(KeyEvent.VK_CONTROL);
                break;
        }
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (Exception e) {}
    }
}