package com.nexus.RPA.repository;

import com.nexus.RPA.entity.TemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TemplateRepository extends JpaRepository<TemplateEntity, Long> {
    List<TemplateEntity> findByUserId(Long userId);
    List<TemplateEntity> findByUserIsNull();
    Optional<TemplateEntity> findByNameAndUserId(String name, Long userId);
}