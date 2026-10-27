package com.nexus.RPA.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.RPA.dto.RpaDtos.PlayTriggerResponseDto;
import com.nexus.RPA.dto.RpaDtos.PlaybackStatusDto;
import com.nexus.RPA.dto.RpaDtos.QueueItemDto;
import com.nexus.RPA.dto.RpaDtos.StepDto;
import com.nexus.RPA.dto.RpaDtos.TemplateDto;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.awt.datatransfer.StringSelection;
import java.awt.Toolkit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class PlaybackService {

    private static class QueuedJob {
        final String jobId;
        final String templateName;
        final String username;
        final List<StepDto> steps;
        final List<String> batchFiles;
        final double estimatedDuration;

        QueuedJob(String templateName, String username, List<StepDto> steps, List<String> batchFiles, double estimatedDuration) {
            this.jobId = UUID.randomUUID().toString().substring(0, 8);
            this.templateName = templateName;
            this.username = username;
            this.steps = steps;
            this.batchFiles = batchFiles;
            this.estimatedDuration = estimatedDuration;
        }
    }

    private final AtomicBoolean isPlaying = new AtomicBoolean(false);
    private volatile boolean isPaused = false;
    private final Object executionLock = new Object();
    private final ConcurrentLinkedQueue<QueuedJob> jobQueue = new ConcurrentLinkedQueue<>();

    private final TemplateService templateService;
    private final RobotActionExecutor robotExecutor;
    private final RpaContextManager contextManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // STATUS TRACKING
    private String currentTemplateName = "";
    private String currentTriggeredBy = "";
    private int currentStepIndex = 0;
    private int totalStepsCount = 0;
    private String currentStepDescription = "Idle";
    private double currentRemainingSeconds = 0.0;

    public PlaybackService(@Lazy TemplateService templateService,
                           RobotActionExecutor robotExecutor,
                           RpaContextManager contextManager) {
        this.templateService = templateService;
        this.robotExecutor = robotExecutor;
        this.contextManager = contextManager;
    }

    public boolean isCurrentlyPlaying() {
        return this.isPlaying.get();
    }

    public void pause() { if (isPlaying.get()) this.isPaused = true; }
    public void resume() { if (isPlaying.get()) this.isPaused = false; }

    public void stop() {
        this.jobQueue.clear();
        this.isPlaying.set(false);
        this.isPaused = false;
        resetStatus();
        System.out.println("[🛑] Playback and Queue forcibly STOPPED.");
    }

    public void removeJobFromQueue(String jobId) {
        jobQueue.removeIf(job -> job.jobId.equals(jobId));
    }

    private void resetStatus() {
        this.currentTemplateName = "";
        this.currentTriggeredBy = "";
        this.currentStepIndex = 0;
        this.totalStepsCount = 0;
        this.currentStepDescription = "Idle";
        this.currentRemainingSeconds = 0.0;
    }

    public PlaybackStatusDto getStatus() {
        int progress = 0;
        if (totalStepsCount > 0) {
            progress = (int) Math.round(((double) currentStepIndex / (double) totalStepsCount) * 100);
        }

        double activeRem = Math.max(0, Math.round(this.currentRemainingSeconds * 10.0) / 10.0);
        double cumulativeWait = activeRem;

        List<QueueItemDto> queueDtos = new ArrayList<>();
        int pos = 1;
        for (QueuedJob q : jobQueue) {
            queueDtos.add(QueueItemDto.builder()
                    .jobId(q.jobId)
                    .templateName(q.templateName)
                    .requestedBy(q.username)
                    .estimatedDurationSeconds(Math.round(q.estimatedDuration * 10.0) / 10.0)
                    .estimatedWaitSecondsBeforeStart(Math.round(cumulativeWait * 10.0) / 10.0)
                    .position(pos++)
                    .build());
            cumulativeWait += q.estimatedDuration;
        }

        return PlaybackStatusDto.builder()
                .playing(this.isPlaying.get())
                .paused(this.isPaused)
                .templateName(this.currentTemplateName)
                .triggeredByUser(this.currentTriggeredBy)
                .currentStep(this.currentStepIndex)
                .totalSteps(this.totalStepsCount)
                .stepDescription(this.currentStepDescription)
                .remainingSeconds(activeRem)
                .totalQueueWaitSeconds(Math.round(cumulativeWait * 10.0) / 10.0)
                .progressPercent(Math.min(100, progress))
                .queueSize(queueDtos.size())
                .queue(queueDtos)
                .build();
    }

    public PlayTriggerResponseDto enqueueOrPlay(TemplateDto template, String username) {
        List<StepDto> fullyExpandedSteps = expandPipelineSteps(template.getSteps(), username, 0);
        double estDuration = calculateTotalDuration(fullyExpandedSteps) + 5.0;

        if (!isPlaying.get() && jobQueue.isEmpty()) {
            new Thread(() -> play(fullyExpandedSteps, template.getName(), false, username)).start();
            return PlayTriggerResponseDto.builder()
                    .status("STARTED")
                    .message("Robot execution started immediately!")
                    .queuePosition(0)
                    .estimatedWaitSeconds(0)
                    .build();
        } else {
            double waitTime = Math.max(0, this.currentRemainingSeconds);
            for (QueuedJob q : jobQueue) {
                waitTime += q.estimatedDuration;
            }
            QueuedJob newJob = new QueuedJob(template.getName(), username, fullyExpandedSteps, null, estDuration);
            jobQueue.add(newJob);
            int position = jobQueue.size();

            if (isPlaying.compareAndSet(false, true)) {
                new Thread(this::processQueueLoop).start();
            }

            return PlayTriggerResponseDto.builder()
                    .status("QUEUED")
                    .message("Robot is busy! Your task is #" + position + " in queue.")
                    .queuePosition(position)
                    .estimatedWaitSeconds(Math.round(waitTime))
                    .build();
        }
    }

    private void processQueueLoop() {
        synchronized (executionLock) {
            try {
                while (!jobQueue.isEmpty()) {
                    QueuedJob nextJob = jobQueue.poll();
                    if (nextJob == null) break;
                    this.isPlaying.set(true);
                    runSingleJobInternal(nextJob.steps, nextJob.templateName, nextJob.username);
                }
            } finally {
                this.isPlaying.set(false);
                this.isPaused = false;
                resetStatus();
            }
        }
    }

    public void playBatch(List<StepDto> steps, List<String> filePaths, String username) {
        List<StepDto> fullyExpandedSteps = expandPipelineSteps(steps, username, 0);

        if (!isPlaying.compareAndSet(false, true)) {
            double est = (calculateTotalDuration(fullyExpandedSteps) * filePaths.size()) + 5.0;
            jobQueue.add(new QueuedJob("BATCH (" + filePaths.size() + " files)", username, fullyExpandedSteps, filePaths, est));
            return;
        }

        synchronized (executionLock) {
            this.isPaused = false;
            this.currentTriggeredBy = username;
            this.totalStepsCount = fullyExpandedSteps.size() * filePaths.size();
            this.currentStepIndex = 0;
            this.currentStepDescription = "Starting Batch (5s prep)...";
            this.currentRemainingSeconds = calculateTotalDuration(fullyExpandedSteps) * filePaths.size() + 5.0;

            if (!smartSleep(5000)) {
                this.isPlaying.set(false);
                return;
            }

            try {
                for (int i = 0; i < filePaths.size(); i++) {
                    if (!isPlaying.get()) break;
                    String currentFile = filePaths.get(i);
                    this.currentTemplateName = "BATCH (" + (i + 1) + "/" + filePaths.size() + ")";
                    executeSteps(fullyExpandedSteps, currentFile, "BATCH", false, username);
                    if (i < filePaths.size() - 1) {
                        if (!smartSleep(2000)) return;
                    }
                }
                while (!jobQueue.isEmpty()) {
                    QueuedJob nextJob = jobQueue.poll();
                    if (nextJob != null) {
                        this.isPlaying.set(true);
                        runSingleJobInternal(nextJob.steps, nextJob.templateName, nextJob.username);
                    }
                }
            } finally {
                this.isPlaying.set(false);
                this.isPaused = false;
                resetStatus();
            }
        }
    }

    public void play(List<StepDto> steps, String templateName, boolean isSubroutine, String username) {
        List<StepDto> fullyExpandedSteps = expandPipelineSteps(steps, username, 0);

        if (isSubroutine) {
            System.out.println("[>> SUBROUTINE START] " + templateName + " (" + fullyExpandedSteps.size() + " steps)");
            executeSteps(fullyExpandedSteps, null, templateName, true, username);
            System.out.println("[<< SUBROUTINE END] " + templateName + " completed cleanly. Resuming main pipeline.");
            return;
        }

        if (!isPlaying.compareAndSet(false, true)) {
            double est = calculateTotalDuration(fullyExpandedSteps) + 5.0;
            jobQueue.add(new QueuedJob(templateName, username, fullyExpandedSteps, null, est));
            System.out.println("[⏳ QUEUED] Added " + templateName + " for user " + username + " to execution queue.");
            return;
        }

        synchronized (executionLock) {
            try {
                runSingleJobInternal(fullyExpandedSteps, templateName, username);

                while (!jobQueue.isEmpty()) {
                    QueuedJob nextJob = jobQueue.poll();
                    if (nextJob != null) {
                        this.isPlaying.set(true);
                        runSingleJobInternal(nextJob.steps, nextJob.templateName, nextJob.username);
                    }
                }
            } finally {
                this.isPlaying.set(false);
                this.isPaused = false;
                resetStatus();
            }
        }
    }

    private void runSingleJobInternal(List<StepDto> steps, String templateName, String username) {
        this.isPaused = false;
        this.currentTemplateName = templateName != null ? templateName : "Sequence";
        this.currentTriggeredBy = username != null ? username : "admin";
        this.totalStepsCount = steps.size();
        this.currentStepIndex = 0;
        this.currentStepDescription = "Preparing Desktop Robot (5s)...";
        this.currentRemainingSeconds = calculateTotalDuration(steps) + 5.0;

        System.out.println("[▶️ MAIN START] " + templateName + " by [" + this.currentTriggeredBy + "] (Total steps: " + steps.size() + ")");

        if (!smartSleep(5000)) {
            return;
        }

        executeSteps(steps, null, templateName, false, username);
        System.out.println("[✅ MAIN FINISHED] Successfully completed " + templateName);
    }

    /**
     * Recursively flattens any macro / procedure inside the steps pipeline
     * so it executes synchronously step-by-step without skipping.
     */
    private List<StepDto> expandPipelineSteps(List<StepDto> rawSteps, String username, int depth) {
        if (rawSteps == null) return new ArrayList<>();
        if (depth > 5) {
            System.err.println("[-] Circular macro reference detected (max depth 5). Stopping expansion.");
            return new ArrayList<>();
        }

        List<StepDto> expanded = new ArrayList<>();

        for (StepDto step : rawSteps) {
            String actionName = step.getActionName();

            // Only treat as macro if it explicitly starts with CUSTOM_PROC_ or type is MACRO.
            boolean isMacro = "MACRO".equalsIgnoreCase(step.getType())
                    || (actionName != null && actionName.startsWith("CUSTOM_PROC_"));

            if (isMacro) {
                String subName = actionName;
                if (actionName != null && actionName.startsWith("CUSTOM_PROC_")) {
                    subName = actionName.substring("CUSTOM_PROC_".length());
                }

                // Fallback to parameter if actionName is generic
                if ((subName == null || subName.isEmpty() || "MACRO".equalsIgnoreCase(subName)) && step.getParameter() != null) {
                    subName = step.getParameter();
                }

                try {
                    TemplateDto subTemplate = templateService.getTemplateByNameAndUser(subName, username);
                    if (subTemplate != null && subTemplate.getSteps() != null && !subTemplate.getSteps().isEmpty()) {
                        List<StepDto> subStepsExpanded = expandPipelineSteps(subTemplate.getSteps(), username, depth + 1);

                        // If user put a post-delay on the macro step itself, add it to the final step of the macro
                        if (!subStepsExpanded.isEmpty()) {
                            StepDto lastSub = subStepsExpanded.get(subStepsExpanded.size() - 1);
                            StepDto cloneLast = cloneStep(lastSub);

                            // Apply the 1.8s rule to the macro transition delay
                            double parentDelay = step.getDelay() != null ? step.getDelay() : 1.0;
                            if (parentDelay <= 1.0) parentDelay = 1.8;

                            double lastSubDelay = lastSub.getDelay() != null ? lastSub.getDelay() : 1.0;
                            if (lastSubDelay <= 1.0) lastSubDelay = 1.8;

                            cloneLast.setDelay(lastSubDelay + parentDelay);
                            subStepsExpanded.set(subStepsExpanded.size() - 1, cloneLast);
                        }

                        expanded.addAll(subStepsExpanded);
                        continue; // Skip adding the macro container step itself
                    }
                } catch (Exception e) {
                    System.err.println("[-] Warning: Failed to expand macro '" + subName + "': " + e.getMessage());
                }
            }

            expanded.add(cloneStep(step));
        }

        return expanded;
    }

    private StepDto cloneStep(StepDto src) {
        StepDto copy = new StepDto();
        copy.setOrderIndex(src.getOrderIndex());
        copy.setType(src.getType());
        copy.setActionName(src.getActionName());
        copy.setParameter(src.getParameter());
        copy.setXCoordinate(src.getXCoordinate());
        copy.setYCoordinate(src.getYCoordinate());
        copy.setDelay(src.getDelay());
        return copy;
    }

    public double calculateTotalDuration(List<StepDto> steps) {
        if (steps == null) return 0.0;
        double total = 0;
        for (StepDto s : steps) {
            double d = s.getDelay() != null ? s.getDelay() : 1.0;
            // The 1.8s Rule for ETA calculation
            if (d <= 1.0) d = 1.8;
            total += d;
        }
        return total;
    }

    private void executeSteps(List<StepDto> steps, String currentFilePath, String runningTemplateName, boolean isSubroutine, String username) {
        int stepsCount = steps.size();

        for (int i = 0; i < stepsCount; i++) {
            if (!isPlaying.get()) {
                System.out.println("[!] Execution aborted.");
                break;
            }

            StepDto step = steps.get(i);

            // =========================================================================
            // THE 1.8s RULE: Enforce minimum delay for stability across pipelines
            // =========================================================================
            double rawDelay = step.getDelay() != null ? step.getDelay() : 1.0;
            if (rawDelay <= 1.0) {
                rawDelay = 1.8;
            }
            long delayMs = (long) (rawDelay * 1000);

            if (!isSubroutine) {
                this.currentStepIndex = i + 1;
                this.currentStepDescription = formatStepDescription(step);

                double remaining = 0;
                for (int j = i; j < stepsCount; j++) {
                    StepDto remStep = steps.get(j);
                    double d = remStep.getDelay() != null ? remStep.getDelay() : 1.0;
                    if (d <= 1.0) d = 1.8;
                    remaining += d;
                }
                this.currentRemainingSeconds = remaining;
            } else {
                this.currentStepDescription = "[Macro: " + runningTemplateName + "] " + formatStepDescription(step);
            }

            if (!smartSleep(delayMs)) return;

            if (!isPlaying.get()) break;

            if ("CLICK".equalsIgnoreCase(step.getType())) {
                robotExecutor.mouseClick(step.getXCoordinate(), step.getYCoordinate());
            }
            else if ("ACTION".equalsIgnoreCase(step.getType())) {
                String actionName = step.getActionName();

                if ("BROWSE_AND_INJECT_FILES".equals(actionName)) {
                    handleBrowseAndInject(steps, i, username);
                    break;
                }
                else if ("TYPE_CURRENT_FILE".equals(actionName)) {
                    if (currentFilePath != null) robotExecutor.pasteText(currentFilePath);
                    else robotExecutor.pasteText(contextManager.getCurrentLoopFile());
                }
                else if ("TYPE_LAST_SAVED_FILE".equals(actionName)) {
                    String lastFile = contextManager.getLastSavedFilePath();
                    if (lastFile != null && !lastFile.isEmpty()) {
                        robotExecutor.pasteText(lastFile);
                    }
                }
                else if ("TYPE_MOTHER_DESTINATION_FILE".equals(actionName)) {
                    robotExecutor.pasteText(contextManager.getFullMotherFilePath());
                }
                else if ("COPY_MOTHER_DESTINATION_TO_CLIPBOARD".equals(actionName)) {
                    try {
                        Toolkit.getDefaultToolkit().getSystemClipboard()
                                .setContents(new StringSelection(contextManager.getFullMotherFilePath()), null);
                    } catch (Exception e) {}
                }
                else if ("CLEAR_CLIPBOARD".equals(actionName)) {
                    contextManager.ensureClipboardCleared();
                }
                else if ("TYPE_TEXT".equals(actionName)) {
                    if (step.getParameter() != null) robotExecutor.pasteText(step.getParameter());
                }
                else if ("DETECT_LATEST_DOWNLOADED_FILE".equals(actionName)) {
                    String targetFolder = (step.getParameter() != null && !step.getParameter().trim().isEmpty())
                            ? step.getParameter().trim()
                            : System.getProperty("user.home") + "/Downloads";
                    contextManager.detectLatestFileInDirectory(targetFolder);
                }
                else if ("SET_MOTHER_DESTINATION".equals(actionName)) {
                    handleSetMotherDestination(step.getParameter());
                }
                else if ("SAVE_CLIPBOARD_TO_MOTHER_DESTINATION".equals(actionName)) {
                    contextManager.saveClipboardToFile(contextManager.getMotherFolderPath(), contextManager.getMotherFileName());
                }
                else if ("SAVE_CLIPBOARD_TO_CSV".equals(actionName)) {
                    handleSaveClipboardToCsv(step.getParameter());
                }
                else if ("SMART_MIG_LOGIN_OR_SKIP".equals(actionName) || "CHECK_LOGIN_AND_AUTH".equals(actionName)) {
                    robotExecutor.handleSmartMigLogin(step.getParameter());
                }
                else if ("OPEN_CHROME".equals(actionName) || "EXECUTE_CMD".equals(actionName)) {
                    handleOpenChrome(step.getParameter());
                }
                else if ("FOCUS_WINDOW".equals(actionName)) {
                    String targetTitle = (step.getParameter() != null && !step.getParameter().trim().isEmpty())
                            ? step.getParameter().trim()
                            : "Citrix";
                    robotExecutor.focusWindowOS(targetTitle);
                }
                else {
                    robotExecutor.executeSpecialAction(actionName);
                }
            }
        }
    }

    private void handleBrowseAndInject(List<StepDto> steps, int currentIndex, String username) {
        try {
            StepDto step = steps.get(currentIndex);
            JsonNode config = objectMapper.readTree(step.getParameter());
            String mode = config.get("mode").asText();
            JsonNode filesNode = config.get("files");

            List<String> files = new ArrayList<>();
            if (filesNode.isArray()) {
                for (JsonNode fileNode : filesNode) {
                    if (fileNode.get("selected").asBoolean()) {
                        files.add(fileNode.get("path").asText());
                    }
                }
            }

            if ("ALL".equals(mode)) {
                String allPaths = "\"" + String.join("\" \"", files) + "\"";
                robotExecutor.pasteText(allPaths);
            }
            else if ("LOOP".equals(mode)) {
                List<StepDto> remainingSteps = steps.subList(currentIndex + 1, steps.size());
                for (int f = 0; f < files.size(); f++) {
                    if (!isPlaying.get()) break;
                    contextManager.setCurrentLoopFile(files.get(f));
                    executeSteps(remainingSteps, contextManager.getCurrentLoopFile(), "BATCH", false, username);
                    if (f < files.size() - 1) smartSleep(1000);
                }
            }
        } catch (Exception e) {}
    }

    private void handleSetMotherDestination(String parameter) {
        try {
            if (parameter != null && parameter.startsWith("{")) {
                JsonNode config = objectMapper.readTree(parameter);
                if (config.has("folder") && !config.get("folder").asText().isEmpty()) {
                    contextManager.setMotherFolderPath(config.get("folder").asText());
                }
                if (config.has("filename") && !config.get("filename").asText().isEmpty()) {
                    contextManager.setMotherFileName(config.get("filename").asText());
                }
            } else if (parameter != null && !parameter.isEmpty()) {
                contextManager.setMotherFolderPath(parameter);
            }
        } catch (Exception e) {}
    }

    private void handleSaveClipboardToCsv(String parameter) {
        String folderPath = "C:\\Nexus_Data";
        String fileName = "Extracted_Data.csv";
        try {
            if (parameter != null && parameter.startsWith("{")) {
                JsonNode config = objectMapper.readTree(parameter);
                if (config.has("folder") && !config.get("folder").asText().isEmpty()) {
                    folderPath = config.get("folder").asText();
                }
                if (config.has("filename") && !config.get("filename").asText().isEmpty()) {
                    fileName = config.get("filename").asText();
                }
            } else if (parameter != null && !parameter.isEmpty()) {
                fileName = parameter;
            }
        } catch (Exception e) {}
        contextManager.saveClipboardToFile(folderPath, fileName);
    }

    private void handleOpenChrome(String parameter) {
        try {
            String cmd = (parameter != null && !parameter.trim().isEmpty())
                    ? parameter
                    : "start chrome --user-data-dir=\"%TEMP%\\nexus_fresh_profile\" --ignore-certificate-errors --incognito --no-first-run --no-default-browser-check --disable-features=ProfilePickerOnStartup --start-maximized \"https://mig-dashboard.kyntus.fr/\"";
            Runtime.getRuntime().exec(new String[]{"cmd", "/c", cmd});
            smartSleep(3500);
        } catch (Exception e) {
            System.err.println("Failed to execute OS command: " + e.getMessage());
        }
    }

    private String formatStepDescription(StepDto step) {
        if ("CLICK".equalsIgnoreCase(step.getType())) {
            return "Click (" + step.getXCoordinate() + ", " + step.getYCoordinate() + ")";
        } else {
            String name = step.getActionName() != null ? step.getActionName() : "ACTION";
            if (name.startsWith("CUSTOM_PROC_")) return "Macro: " + name.replace("CUSTOM_PROC_", "");
            if ("SMART_MIG_LOGIN_OR_SKIP".equals(name) || "CHECK_LOGIN_AND_AUTH".equals(name)) return "Smart SSL Bypass & Direct Login";
            if ("SAVE_CLIPBOARD_TO_MOTHER_DESTINATION".equals(name)) return "Save -> Mother Path (" + contextManager.getMotherFileName() + ")";
            if ("TYPE_MOTHER_DESTINATION_FILE".equals(name)) return "Type Mother File -> " + contextManager.getMotherFileName();
            if ("COPY_MOTHER_DESTINATION_TO_CLIPBOARD".equals(name)) return "Copy Mother Path -> Clipboard";
            return name;
        }
    }

    private boolean smartSleep(long milliseconds) {
        long elapsed = 0;
        long interval = 100;
        while (elapsed < milliseconds) {
            if (!isPlaying.get()) return false;
            if (isPaused) {
                try { Thread.sleep(interval); } catch (InterruptedException e) {}
                continue;
            }
            try { Thread.sleep(interval); } catch (InterruptedException e) {}
            elapsed += interval;
            this.currentRemainingSeconds = Math.max(0, this.currentRemainingSeconds - 0.1);
        }
        return true;
    }
}