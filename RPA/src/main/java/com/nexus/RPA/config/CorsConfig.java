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

        // 🔥 Khli ay IP t-connecta (mzyana l'reseau local dyalek)
        config.setAllowCredentials(false);
        config.addAllowedOriginPattern("*");

        // 🔥 Khli ga3 les headers idouzou (darouriya l Private Network Access dyal Chrome)
        config.addAllowedHeader("*");
        config.addExposedHeader("*");

        // 🔥 Khli ga3 les méthodes (GET, POST, OPTIONS, PUT, DELETE)
        config.addAllowedMethod("*");

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}