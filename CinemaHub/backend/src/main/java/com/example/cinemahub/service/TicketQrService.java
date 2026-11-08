package com.example.cinemahub.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import javax.imageio.ImageIO;

@Service
public class TicketQrService {
    public byte[] png(String payload) {
        if (payload == null || payload.isBlank() || payload.length() > 512)
            throw new IllegalArgumentException("Vé chưa có mã QR hợp lệ");
        try {
            var matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 320, 320,
                    Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, EncodeHintType.MARGIN, 4));
            var image = new BufferedImage(matrix.getWidth(), matrix.getHeight(), BufferedImage.TYPE_INT_RGB);
            for (int y = 0; y < matrix.getHeight(); y++)
                for (int x = 0; x < matrix.getWidth(); x++)
                    image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            var output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể tạo ảnh QR của vé", ex);
        }
    }
}
