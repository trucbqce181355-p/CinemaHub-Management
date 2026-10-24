package com.example.cinemahub.service;

import org.springframework.stereotype.Component;
import java.util.concurrent.Callable;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Supplier;

/**
 * Coordinates admission with management writes in this backend instance.
 * MongoDB standalone cannot transact across ticket, booking and showtime documents.
 * Multi-instance deployments must replace this with cross-instance coordination.
 */
@Component
public class AdmissionCoordinator {
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock(true);

    public <T> T read(Supplier<T> action) {
        lock.readLock().lock();
        try { return action.get(); }
        finally { lock.readLock().unlock(); }
    }

    public <T> T write(Supplier<T> action) {
        lock.writeLock().lock();
        try { return action.get(); }
        finally { lock.writeLock().unlock(); }
    }

    public void write(Runnable action) {
        write(() -> { action.run(); return null; });
    }

    public <T> T writeChecked(Callable<T> action) throws Exception {
        lock.writeLock().lock();
        try { return action.call(); }
        finally { lock.writeLock().unlock(); }
    }
}
