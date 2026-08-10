/**
 * Architecture Generation Queue System
 * Optimized for Render Free Tier (512 MB RAM)
 * Limits concurrent architecture generations to prevent memory exhaustion
 */

interface QueueTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  id: string;
  timestamp: number;
}

class ArchitectureQueue {
  private queue: QueueTask<any>[] = [];
  private processing = 0;
  private maxConcurrent: number;
  private timeout: number;
  private completedTasks = new Map<string, number>();

  constructor(maxConcurrent = 3, timeout = 30000) {
    this.maxConcurrent = maxConcurrent;
    this.timeout = timeout;
    
    // Update global stats for health monitoring
    if (typeof global !== 'undefined') {
      (global as any).architectureQueue = this;
    }
  }

  /**
   * Add a task to the queue
   */
  async add<T>(task: () => Promise<T>, taskId?: string): Promise<T> {
    const id = taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const queueTask: QueueTask<T> = {
        task,
        resolve,
        reject,
        id,
        timestamp: Date.now()
      };

      this.queue.push(queueTask);
      this.process();
    });
  }

  /**
   * Process queue items
   */
  private async process(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const { task, resolve, reject, id, timestamp } = this.queue.shift()!;

    // Add timeout protection
    const timeoutId = setTimeout(() => {
      reject(new Error(`Task ${id} timed out after ${this.timeout}ms`));
      this.processing--;
      this.process();
    }, this.timeout);

    try {
      const result = await task();
      clearTimeout(timeoutId);
      
      // Track completion time
      const duration = Date.now() - timestamp;
      this.completedTasks.set(id, duration);
      
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    } finally {
      this.processing--;
      this.process();
    }
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrent: this.maxConcurrent,
      completedTasks: this.completedTasks.size,
      averageDuration: this.getAverageDuration()
    };
  }

  /**
   * Get average task completion duration
   */
  private getAverageDuration(): number {
    if (this.completedTasks.size === 0) return 0;
    
    const total = Array.from(this.completedTasks.values()).reduce((sum, duration) => sum + duration, 0);
    return Math.round(total / this.completedTasks.size);
  }

  /**
   * Clear completed task history
   */
  clearHistory(): void {
    this.completedTasks.clear();
  }

  /**
   * Update max concurrent tasks (useful for dynamic scaling)
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
  }
}

// Singleton instance for architecture generation
export const architectureQueue = new ArchitectureQueue(3, 30000);

// Export class for custom instances
export { ArchitectureQueue };