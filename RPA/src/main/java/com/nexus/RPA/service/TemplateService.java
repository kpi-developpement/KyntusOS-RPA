package com.nexus.RPA.service;

import com.nexus.RPA.dto.RpaDtos.StepDto;
import com.nexus.RPA.dto.RpaDtos.TemplateDto;
import com.nexus.RPA.entity.StepEntity;
import com.nexus.RPA.entity.TemplateEntity;
import com.nexus.RPA.entity.UserEntity;
import com.nexus.RPA.repository.TemplateRepository;
import com.nexus.RPA.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final UserRepository userRepository;

    public TemplateService(TemplateRepository templateRepository, UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TemplateDto saveTemplate(TemplateDto dto, String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByUsername("admin")
                        .orElseThrow(() -> new RuntimeException("Admin user not found")));

        TemplateEntity entity = templateRepository.findByNameAndUserId(dto.getName(), user.getId())
                .orElse(new TemplateEntity());

        entity.setName(dto.getName());
        entity.setUser(user);

        if (entity.getSteps() != null) {
            entity.getSteps().clear();
        }

        List<StepEntity> stepEntities = dto.getSteps().stream().map(stepDto -> {
            StepEntity step = new StepEntity();
            step.setOrderIndex(stepDto.getOrderIndex());
            step.setType(stepDto.getType());
            step.setXCoordinate(stepDto.getXCoordinate());
            step.setYCoordinate(stepDto.getYCoordinate());
            step.setDelay(stepDto.getDelay());
            step.setActionName(stepDto.getActionName());
            step.setParameter(stepDto.getParameter());
            return step;
        }).collect(Collectors.toList());

        entity.getSteps().addAll(stepEntities);
        TemplateEntity saved = templateRepository.save(entity);
        return convertToDto(saved);
    }

    @Transactional
    public List<TemplateDto> getAllTemplatesByUser(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByUsername("admin")
                        .orElseThrow(() -> new RuntimeException("User not found")));

        // Ila kan admin, n-t2kkdou bli ga3 les templates li bla user_id يرجعو lih
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            List<TemplateEntity> orphans = templateRepository.findByUserIsNull();
            if (!orphans.isEmpty()) {
                for (TemplateEntity o : orphans) {
                    o.setUser(user);
                }
                templateRepository.saveAll(orphans);
            }

            // Admin kay-chof ga3 les templates dyalo + اي template makaynach 3ndo mais kayna f DB (deduplicated by name)
            List<TemplateEntity> adminTemplates = templateRepository.findByUserId(user.getId());
            Set<String> seenNames = adminTemplates.stream()
                    .map(TemplateEntity::getName)
                    .collect(Collectors.toSet());

            List<TemplateEntity> allDbTemplates = templateRepository.findAll();
            for (TemplateEntity t : allDbTemplates) {
                if (!seenNames.contains(t.getName())) {
                    adminTemplates.add(t);
                    seenNames.add(t.getName());
                }
            }

            return adminTemplates.stream().map(this::convertToDto).collect(Collectors.toList());
        }

        // User 3adi kay-chof ghir dakchi li affecta lih l'admin
        return templateRepository.findByUserId(user.getId())
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<TemplateDto> getAllSystemTemplatesForAdmin() {
        return templateRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public TemplateDto getTemplateByNameAndUser(String name, String username) {
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            Optional<TemplateEntity> exactMatch = templateRepository.findByNameAndUserId(name, userOpt.get().getId());
            if (exactMatch.isPresent()) {
                return convertToDto(exactMatch.get());
            }
        }

        // Fallback l'admin awla desktop studio (bla token) : n-9elbou f templates d admin awla f DB kamla
        Optional<UserEntity> adminOpt = userRepository.findByUsername("admin");
        if (adminOpt.isPresent()) {
            Optional<TemplateEntity> adminMatch = templateRepository.findByNameAndUserId(name, adminOpt.get().getId());
            if (adminMatch.isPresent()) {
                return convertToDto(adminMatch.get());
            }
        }

        TemplateEntity anyMatch = templateRepository.findAll().stream()
                .filter(t -> t.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Template not found: " + name));

        return convertToDto(anyMatch);
    }

    private TemplateDto convertToDto(TemplateEntity entity) {
        TemplateDto dto = new TemplateDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setOwnerUsername(entity.getUser() != null ? entity.getUser().getUsername() : "admin");
        dto.setSteps(entity.getSteps().stream().map(step -> {
            StepDto sDto = new StepDto();
            sDto.setOrderIndex(step.getOrderIndex());
            sDto.setType(step.getType());
            sDto.setXCoordinate(step.getXCoordinate());
            sDto.setYCoordinate(step.getYCoordinate());
            sDto.setDelay(step.getDelay());
            sDto.setActionName(step.getActionName());
            sDto.setParameter(step.getParameter());
            return sDto;
        }).collect(Collectors.toList()));
        return dto;
    }

    @Transactional
    public void deleteTemplate(Long id, String username) {
        TemplateEntity template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        if (!"admin".equalsIgnoreCase(username)) {
            UserEntity user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            if (template.getUser() != null && !template.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Unauthorized to delete this template");
            }
        }

        templateRepository.deleteById(id);
    }

    @Transactional
    public void dispatchTemplate(Long templateId, String targetUsername) {
        TemplateEntity original = templateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        UserEntity targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        // Ila kanet deja 3nd had l'user, n-حدثوها (overwrite) bach dima tkoun 3ndo la dernière version
        TemplateEntity clone = templateRepository.findByNameAndUserId(original.getName(), targetUser.getId())
                .orElse(new TemplateEntity());

        clone.setName(original.getName());
        clone.setUser(targetUser);

        if (clone.getSteps() != null) {
            clone.getSteps().clear();
        }

        List<StepEntity> clonedSteps = original.getSteps().stream().map(s -> {
            StepEntity cs = new StepEntity();
            cs.setOrderIndex(s.getOrderIndex());
            cs.setType(s.getType());
            cs.setXCoordinate(s.getXCoordinate());
            cs.setYCoordinate(s.getYCoordinate());
            cs.setDelay(s.getDelay());
            cs.setActionName(s.getActionName());
            cs.setParameter(s.getParameter());
            return cs;
        }).collect(Collectors.toList());

        clone.getSteps().addAll(clonedSteps);
        templateRepository.save(clone);

        // AUTO-DISPATCH SUB-MACROS: Ila kan had l'workflow kay-3eyyet l chi macro (CUSTOM_PROC_...), n-dispatchiwha m3ah automatiquement!
        for (StepEntity s : original.getSteps()) {
            if ("ACTION".equalsIgnoreCase(s.getType()) && s.getActionName() != null && s.getActionName().startsWith("CUSTOM_PROC_")) {
                String subMacroName = s.getActionName().replace("CUSTOM_PROC_", "");
                templateRepository.findAll().stream()
                        .filter(t -> t.getName().equalsIgnoreCase(subMacroName))
                        .findFirst()
                        .ifPresent(subMacro -> {
                            if (!subMacro.getId().equals(original.getId())) {
                                Optional<TemplateEntity> existingSub = templateRepository.findByNameAndUserId(subMacro.getName(), targetUser.getId());
                                if (existingSub.isEmpty()) {
                                    TemplateEntity subClone = new TemplateEntity();
                                    subClone.setName(subMacro.getName());
                                    subClone.setUser(targetUser);
                                    List<StepEntity> subSteps = subMacro.getSteps().stream().map(subStep -> {
                                        StepEntity scs = new StepEntity();
                                        scs.setOrderIndex(subStep.getOrderIndex());
                                        scs.setType(subStep.getType());
                                        scs.setXCoordinate(subStep.getXCoordinate());
                                        scs.setYCoordinate(subStep.getYCoordinate());
                                        scs.setDelay(subStep.getDelay());
                                        scs.setActionName(subStep.getActionName());
                                        scs.setParameter(subStep.getParameter());
                                        return scs;
                                    }).collect(Collectors.toList());
                                    subClone.getSteps().addAll(subSteps);
                                    templateRepository.save(subClone);
                                }
                            }
                        });
            }
        }
    }
}