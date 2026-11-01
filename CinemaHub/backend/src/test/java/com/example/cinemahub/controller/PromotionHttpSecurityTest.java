package com.example.cinemahub.controller;

import com.example.cinemahub.config.SecurityConfig;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import com.example.cinemahub.security.*;
import com.example.cinemahub.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PromotionHttpSecurityTest {
    AnnotationConfigWebApplicationContext context; MockMvc mvc;
    @BeforeEach void setup() {
        context = new AnnotationConfigWebApplicationContext(); context.setServletContext(new MockServletContext());
        context.register(Config.class); context.refresh(); mvc = webAppContextSetup(context).apply(springSecurity()).build();
    }
    @AfterEach void close() { context.close(); }
    @ParameterizedTest @ValueSource(strings={"Customer", "Staff"})
    void nonManagersCannotReadManagementOrWriteEitherResource(String role) throws Exception {
        for (String path : List.of("/api/promotions", "/api/pricing-rules")) {
            mvc.perform(get(path).with(user("actor").roles(role))).andExpect(status().isForbidden());
            mvc.perform(post(path).with(user("actor").roles(role)).contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
            mvc.perform(put(path+"/p").with(user("actor").roles(role)).contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
            mvc.perform(delete(path+"/p").with(user("actor").roles(role))).andExpect(status().isForbidden());
        }
        verifyNoInteractions(context.getBean(PromotionManagementService.class));
    }
    @Test void anonymousCannotWriteButCanReadPublicPromotions() throws Exception {
        mvc.perform(post("/api/promotions").contentType("application/json").content("{}"))
                .andExpect(status().is4xxClientError());
        mvc.perform(get("/api/promotions/active")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @ParameterizedTest @ValueSource(strings={"Manager", "Admin"})
    void permittedRolesGetValidationErrorsBeforePersistence(String role) throws Exception {
        for (String path : List.of("/api/promotions", "/api/pricing-rules")) {
            mvc.perform(get(path).with(user("manager").roles(role))).andExpect(status().isOk());
            mvc.perform(post(path).with(user("manager").roles(role)).contentType("application/json").content("{}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
        }
        verifyNoInteractions(context.getBean(PromotionManagementService.class));
    }
    @Test void managerCanCreateThroughTheDtoButCannotChooseDocumentId() throws Exception {
        Promotion created=new Promotion();created.setId("server-id");
        when(context.getBean(PromotionManagementService.class).create(any(Promotion.class))).thenReturn(created);
        mvc.perform(post("/api/promotions").with(user("manager").roles("Manager"))
                .contentType("application/json").content("""
                {"id":"existing-id","code":"QA10","title":"Test","discountType":"Percentage","discountValue":10,
                 "startDate":"2030-01-01T00:00:00","endDate":"2030-02-01T00:00:00","status":"Active"}
                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value("server-id"));
        var capture=org.mockito.ArgumentCaptor.forClass(Promotion.class);
        verify(context.getBean(PromotionManagementService.class)).create(capture.capture());
        org.junit.jupiter.api.Assertions.assertNull(capture.getValue().getId());
    }
    @Test void anonymousCanPreviewPriceWithoutAnAuthenticationPrincipal() throws Exception {
        var result=com.example.cinemahub.dto.CalculatePriceRequest.PriceResult.builder().subtotal(100000d).discountAmount(0d).totalAmount(100000d).build();
        when(context.getBean(BookingService.class).calculatePrice(any(com.example.cinemahub.dto.CalculatePriceRequest.class),isNull())).thenReturn(result);
        mvc.perform(post("/api/bookings/calculate-price").contentType("application/json")
                .content("{\"showtimeId\":\"s\",\"seatIds\":[\"A1\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalAmount").value(100000));
        verify(context.getBean(BookingService.class)).calculatePrice(any(com.example.cinemahub.dto.CalculatePriceRequest.class),isNull());
    }
    @Test void signedInPricePreviewStillUsesTheCurrentCustomerIdentity() throws Exception {
        var result=com.example.cinemahub.dto.CalculatePriceRequest.PriceResult.builder().subtotal(100000d).discountAmount(10000d).totalAmount(90000d).build();
        when(context.getBean(BookingService.class).calculatePrice(any(com.example.cinemahub.dto.CalculatePriceRequest.class),eq("owner"))).thenReturn(result);
        mvc.perform(post("/api/bookings/calculate-price").with(user("owner").roles("Customer")).contentType("application/json")
                .content("{\"showtimeId\":\"s\",\"seatIds\":[\"A1\"],\"promoCode\":\"TEST\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalAmount").value(90000));
    }
    @Test void publicResponseOmitsPersonalVouchersAndInternalFields() throws Exception {
        Promotion pub = new Promotion(); pub.setId("internal"); pub.setCode("PUBLIC"); pub.setTitle("Public"); pub.setConditions(Map.of("minSpend", 100000));
        Promotion privateVoucher = new Promotion(); privateVoucher.setCode("SECRET"); privateVoucher.setConditions(Map.of("redeemedByUserId", "owner"));
        when(context.getBean(PromotionRepository.class).findActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(pub,privateVoucher));
        mvc.perform(get("/api/promotions/active")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].code").value("PUBLIC")).andExpect(jsonPath("$[0].id").doesNotExist())
                .andExpect(jsonPath("$[0].conditions").doesNotExist());
    }
    @Configuration @EnableWebMvc @EnableWebSecurity @Import({SecurityConfig.class,PromotionErrorHandler.class})
    static class Config {
        @Bean org.springframework.data.mongodb.core.MongoTemplate mongo() { return mock(org.springframework.data.mongodb.core.MongoTemplate.class); }
        @Bean static org.springframework.beans.factory.config.BeanFactoryPostProcessor previewMocks() {
            return factory -> factory.registerSingleton("bookingService", mock(BookingService.class));
        }
        @Bean PaymentService paymentService() { return mock(PaymentService.class); }
        @Bean BookingController bookingController() { return new BookingController(); }
        @Bean PromotionRepository promotions() { return mock(PromotionRepository.class); }
        @Bean PricingRuleRepository pricing() { return mock(PricingRuleRepository.class); }
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean JwtUtil jwtUtil() { return mock(JwtUtil.class); }
        @Bean JwtFilter jwtFilter() { return new JwtFilter(); }
        @Bean PromotionValidationService validation() { return mock(PromotionValidationService.class); }
        @Bean PromotionManagementService management() { return mock(PromotionManagementService.class); }
        @Bean PromotionController promotionsController(PromotionRepository p, PromotionValidationService v, PromotionManagementService m) { return new PromotionController(p,v,m); }
        @Bean PricingRuleController pricingController(PricingRuleRepository p, PromotionManagementService m) { return new PricingRuleController(p,m); }
    }
}
