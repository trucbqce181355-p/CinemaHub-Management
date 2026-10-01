package com.example.cinemahub;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"payment.scheduler.enabled=false", "app.seed-users=false", "app.seed-data=false",
        "spring.mongodb.database=cinemahub_context_test", "vnpay.enabled=false"})
class CinemaHubApplicationTests {

	@Test
	void contextLoads() {
	}

}
