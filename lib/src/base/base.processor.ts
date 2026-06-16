import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { createLogger } from '@lib/helpers/app.helper';
import type { AllJobs } from '@lib/common/interfaces/bullmq.interface';

export abstract class BaseProcessor extends WorkerHost {
  protected readonly logger = createLogger(this.constructor.name);

  @OnWorkerEvent('active')
  onActive(job: AllJobs) {
    this.logger.debug(
      `Processing job ${job.queueName}:${job.name} with data: ${JSON.stringify(job.data)}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: AllJobs) {
    this.logger.debug(`Completed job ${job.queueName}:${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: AllJobs | undefined, error: Error) {
    if (!job) {
      this.logger.error(`Job failed but job is undefined`, error.stack);
      return;
    }

    const currentAttempt = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 1;

    const remainingAttempts = Math.max(maxAttempts - currentAttempt, 0);

    this.logger.error(
      [
        `Job failed`,
        `id=${job.id}`,
        `queue=${job.queueName}`,
        `name=${job.name}`,
        `attempt=${currentAttempt}/${maxAttempts}`,
        `remaining=${remainingAttempts}`,
        `error=${error.message}`,
      ].join(' | '),

      error.stack,
    );
  }
}
