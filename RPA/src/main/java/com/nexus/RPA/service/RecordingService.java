package com.nexus.RPA.service;

import com.github.kwhat.jnativehook.GlobalScreen;
import com.github.kwhat.jnativehook.keyboard.NativeKeyEvent;
import com.github.kwhat.jnativehook.keyboard.NativeKeyListener;
import com.github.kwhat.jnativehook.mouse.NativeMouseEvent;
import com.github.kwhat.jnativehook.mouse.NativeMouseInputListener;
import com.nexus.RPA.dto.RpaDtos.StepDto;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.awt.GraphicsEnvironment;
import java.awt.Point;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class RecordingService implements NativeMouseInputListener, NativeKeyListener {

    private boolean isRecording = false;
    private long lastActionTime = 0;
    private final List<StepDto> currentRecording = new ArrayList<>();
    private int stepCounter = 0;

    private StringBuilder textBuffer = new StringBuilder();
    private boolean ctrlPressed = false;
    private boolean winPressed = false;

    private boolean isSingleClickCapture = false;
    private CompletableFuture<Point> singleClickFuture;

    @PostConstruct
    public void init() {
        if (GraphicsEnvironment.isHeadless()) {
            System.out.println("[!] Headless mode: JNativeHook disabled (Master Server).");
            return;
        }
        try {
            GlobalScreen.registerNativeHook();
            GlobalScreen.addNativeMouseListener(this);
            GlobalScreen.addNativeKeyListener(this);
            System.out.println("[+] JNativeHook registered successfully (Mouse & Keyboard).");
        } catch (Exception e) {
            System.err.println("Failed to register JNativeHook: " + e.getMessage());
        }
    }

    @PreDestroy
    public void cleanup() {
        if (GraphicsEnvironment.isHeadless()) return;
        try {
            GlobalScreen.unregisterNativeHook();
        } catch (Exception e) {}
    }

    public CompletableFuture<Point> captureSingleClick() {
        this.isSingleClickCapture = true;
        this.singleClickFuture = new CompletableFuture<>();
        System.out.println("[🎯] Sniper Mode Activated: Waiting for 1 click...");
        return this.singleClickFuture;
    }

    public void startRecording() {
        currentRecording.clear();
        textBuffer.setLength(0);
        stepCounter = 0;
        ctrlPressed = false;
        winPressed = false;
        isRecording = true;
        lastActionTime = System.currentTimeMillis();
        System.out.println("[+] Recording Started...");
    }

    public List<StepDto> stopRecording() {
        isRecording = false;
        flushTextBuffer();

        if (!currentRecording.isEmpty() && "CLICK".equals(currentRecording.get(currentRecording.size() - 1).getType())) {
            currentRecording.remove(currentRecording.size() - 1);
        }

        System.out.println("[+] Recording Stopped. Total steps: " + currentRecording.size());
        return new ArrayList<>(currentRecording);
    }

    private void flushTextBuffer() {
        if (textBuffer.length() > 0) {
            StepDto step = new StepDto();
            step.setOrderIndex(stepCounter++);
            step.setType("ACTION");
            step.setActionName("TYPE_TEXT");
            step.setParameter(textBuffer.toString());
            step.setDelay(1.0);
            currentRecording.add(step);
            textBuffer.setLength(0);
        }
    }

    @Override
    public void nativeMouseClicked(NativeMouseEvent e) {
        if (isSingleClickCapture) {
            isSingleClickCapture = false;
            if (singleClickFuture != null) {
                singleClickFuture.complete(new Point(e.getX(), e.getY()));
                System.out.println("[🎯] Target Acquired -> X: " + e.getX() + " | Y: " + e.getY());
            }
            return;
        }

        if (isRecording) {
            flushTextBuffer();
            long currentTime = System.currentTimeMillis();
            double delay = (currentTime - lastActionTime) / 1000.0;
            lastActionTime = currentTime;

            StepDto step = new StepDto();
            step.setOrderIndex(stepCounter++);
            step.setType("CLICK");
            step.setXCoordinate(e.getX());
            step.setYCoordinate(e.getY());
            step.setDelay(Math.round(delay * 10.0) / 10.0);

            currentRecording.add(step);
        }
    }

    @Override
    public void nativeKeyPressed(NativeKeyEvent e) {
        if (!isRecording || isSingleClickCapture) return;

        if (e.getKeyCode() == NativeKeyEvent.VC_CONTROL) ctrlPressed = true;
        if (e.getKeyCode() == NativeKeyEvent.VC_META) winPressed = true;

        String actionToRecord = null;

        if (ctrlPressed && e.getKeyCode() == NativeKeyEvent.VC_C) actionToRecord = "CTRL_C";
        else if (ctrlPressed && e.getKeyCode() == NativeKeyEvent.VC_V) actionToRecord = "CTRL_V";
        else if (ctrlPressed && e.getKeyCode() == NativeKeyEvent.VC_A) actionToRecord = "CTRL_A";
        else if (ctrlPressed && e.getKeyCode() == NativeKeyEvent.VC_HOME) actionToRecord = "CTRL_HOME";
        else if (ctrlPressed && e.getKeyCode() == NativeKeyEvent.VC_L) actionToRecord = "CTRL_L";
        else if (winPressed && e.getKeyCode() == NativeKeyEvent.VC_UP) actionToRecord = "WIN_UP";
        else if (e.getKeyCode() == NativeKeyEvent.VC_ENTER) actionToRecord = "ENTER";
        else if (e.getKeyCode() == NativeKeyEvent.VC_ESCAPE) actionToRecord = "ESC";

        if (actionToRecord != null) {
            flushTextBuffer();
            long currentTime = System.currentTimeMillis();
            double delay = (currentTime - lastActionTime) / 1000.0;
            lastActionTime = currentTime;

            StepDto step = new StepDto();
            step.setOrderIndex(stepCounter++);
            step.setType("ACTION");
            step.setActionName(actionToRecord);
            step.setDelay(Math.round(delay * 10.0) / 10.0);
            currentRecording.add(step);
        }
    }

    @Override
    public void nativeKeyReleased(NativeKeyEvent e) {
        if (e.getKeyCode() == NativeKeyEvent.VC_CONTROL) ctrlPressed = false;
        if (e.getKeyCode() == NativeKeyEvent.VC_META) winPressed = false;
    }

    @Override
    public void nativeKeyTyped(NativeKeyEvent e) {
        if (!isRecording || isSingleClickCapture) return;
        if (!ctrlPressed && !winPressed && e.getKeyChar() != NativeKeyEvent.CHAR_UNDEFINED && !Character.isISOControl(e.getKeyChar())) {
            textBuffer.append(e.getKeyChar());
        }
    }
}