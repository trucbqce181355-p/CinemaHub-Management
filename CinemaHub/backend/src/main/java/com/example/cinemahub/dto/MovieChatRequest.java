
package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MovieChatRequest(
        @NotBlank(message = "Vui lòng nhập nội dung cần tư vấn")
        @Size(max = 500, message = "Tin nhắn tối đa 500 ký tự")
        String message) {
}
