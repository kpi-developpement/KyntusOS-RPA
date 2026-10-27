package com.nexus.RPA.controller;

import com.nexus.RPA.dto.RpaDtos.PlayTriggerResponseDto;
import com.nexus.RPA.dto.RpaDtos.PlaybackStatusDto;
import com.nexus.RPA.dto.RpaDtos.StepDto;
import com.nexus.RPA.dto.RpaDtos.TemplateDto;
import com.nexus.RPA.service.PlaybackService;
import com.nexus.RPA.service.RecordingService;
import com.nexus.RPA.service.TemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.awt.Point;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/rpa")
public class RpaController {

    private final RecordingService recordingService;
    private final PlaybackService playbackService;
    private final TemplateService templateService;

    public RpaController(RecordingService recordingService, PlaybackService playbackService, TemplateService templateService) {
        this.recordingService = recordingService;
        this.playbackService = playbackService;
        this.templateService = templateService;
    }

    private String getUsername(Principal principal) {
        return (principal != null) ? principal.getName() : "admin";
    }

    @PostMapping("/record/start")
    public ResponseEntity<String> startRecording() {
        recordingService.startRecording();
        return ResponseEntity.ok("Recording started");
    }

    @PostMapping("/record/stop")
    public ResponseEntity<List<StepDto>> stopRecording() {
        return ResponseEntity.ok(recordingService.stopRecording());
    }

    @GetMapping("/record/single-click")
    public ResponseEntity<Map<String, Integer>> captureSingleClick() throws ExecutionException, InterruptedException {
        Point p = recordingService.captureSingleClick().get();
        return ResponseEntity.ok(Map.of("x", p.x, "y", p.y));
    }

    @PostMapping("/templates")
    public ResponseEntity<TemplateDto> saveTemplate(@RequestBody TemplateDto templateDto, Principal principal) {
        return ResponseEntity.ok(templateService.saveTemplate(templateDto, getUsername(principal)));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<TemplateDto>> getTemplates(Principal principal) {
        return ResponseEntity.ok(templateService.getAllTemplatesByUser(getUsername(principal)));
    }

    @GetMapping("/templates/all")
    public ResponseEntity<List<TemplateDto>> getAllSystemTemplates() {
        return ResponseEntity.ok(templateService.getAllSystemTemplatesForAdmin());
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<String> deleteTemplate(@PathVariable Long id, Principal principal) {
        templateService.deleteTemplate(id, getUsername(principal));
        return ResponseEntity.ok("Template deleted successfully");
    }

    @PostMapping("/play/{templateName}")
    public ResponseEntity<PlayTriggerResponseDto> playTemplate(@PathVariable String templateName, Principal principal) {
        String user = getUsername(principal);
        TemplateDto template = templateService.getTemplateByNameAndUser(templateName, user);
        PlayTriggerResponseDto response = playbackService.enqueueOrPlay(template, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/play/batch/{templateName}")
    public ResponseEntity<String> playBatchTemplate(@PathVariable String templateName, @RequestBody List<String> filePaths, Principal principal) {
        TemplateDto template = templateService.getTemplateByNameAndUser(templateName, getUsername(principal));
        new Thread(() -> playbackService.playBatch(template.getSteps(), filePaths, getUsername(principal))).start();
        return ResponseEntity.ok("Batch Playback initiated");
    }

    @GetMapping("/play/status")
    public ResponseEntity<PlaybackStatusDto> getPlaybackStatus() {
        return ResponseEntity.ok(playbackService.getStatus());
    }

    @DeleteMapping("/play/queue/{jobId}")
    public ResponseEntity<String> cancelQueuedJob(@PathVariable String jobId) {
        playbackService.removeJobFromQueue(jobId);
        return ResponseEntity.ok("Queued job removed");
    }

    @PostMapping("/play/pause")
    public ResponseEntity<String> pausePlayback() {
        playbackService.pause();
        return ResponseEntity.ok("Paused");
    }

    @PostMapping("/play/resume")
    public ResponseEntity<String> resumePlayback() {
        playbackService.resume();
        return ResponseEntity.ok("Resumed");
    }

    @PostMapping("/play/stop")
    public ResponseEntity<String> stopPlayback() {
        playbackService.stop();
        return ResponseEntity.ok("Stopped");
    }

    @PostMapping("/templates/{id}/dispatch/{targetUsername}")
    public ResponseEntity<String> dispatchTemplate(@PathVariable Long id, @PathVariable String targetUsername) {
        templateService.dispatchTemplate(id, targetUsername);
        return ResponseEntity.ok("Template dispatched successfully to " + targetUsername);
    }
}