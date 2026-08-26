import { AppException, isErrorEnvelope } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';

describe('AppException', () => {
  it('produces a {error:{code,message}} envelope', () => {
    const err = new AppException(404, ErrorCode.TASK_NOT_FOUND, 'Task 1 not found');
    expect(err.getStatus()).toBe(404);
    expect(err.getResponse()).toEqual({
      error: { code: ErrorCode.TASK_NOT_FOUND, message: 'Task 1 not found' },
    });
    expect(isErrorEnvelope(err.getResponse())).toBe(true);
  });
});
