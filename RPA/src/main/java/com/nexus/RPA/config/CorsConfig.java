package com.nexus.RPA.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // Khli ay blassa t-connecta (Next.js f port 3000)
        config.addAllowedOrigin("*");
        // Khli ga3 les headers idouzou
        config.addAllowedHeader("*");
        // Khli ga3 les méthodes (GET, POST, OPTIONS, PUT, DELETE)
        config.addAllowedMethod("*");

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}