import { FirebaseGuard } from './firebase-auth.guard';

describe('FirebaseGuard', () => {
  it('should be defined', () => {
    expect(new FirebaseGuard()).toBeDefined();
  });
});
