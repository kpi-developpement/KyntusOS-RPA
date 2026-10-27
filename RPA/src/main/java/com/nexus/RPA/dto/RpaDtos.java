package com.nexus.RPA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class RpaDtos {

    @Data
    public static class StepDto {
        private Integer orderIndex;
        private String type;

        @JsonProperty("xCoordinate")
        private Integer xCoordinate;

        @JsonProperty("yCoordinate")
        private Integer yCoordinate;

        private Double delay;
        private String actionName;
        private String parameter;
    }

    @Data
    public static class TemplateDto {
        private Long id;
        private String name;
        private String ownerUsername;
        private List<StepDto> steps;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QueueItemDto {
        private String jobId;
        private String templateName;
        private String requestedBy;
        private double estimatedDurationSeconds;
        private double estimatedWaitSecondsBeforeStart;
        private int position;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayTriggerResponseDto {
        private String status; // "STARTED" or "QUEUED"
        private String message;
        private int queuePosition;
        private double estimatedWaitSeconds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlaybackStatusDto {
        private boolean playing;
        private boolean paused;
        private String templateName;
        private String triggeredByUser;
        private int currentStep;
        private int totalSteps;
        private String stepDescription;
        private double remainingSeconds;
        private double totalQueueWaitSeconds;
        private int progressPercent;
        private int queueSize;
        private List<QueueItemDto> queue;
    }
}