import { describe, it, expect } from 'vitest';
import { UserSchema, UserRoleSchema, ApiResponseSchema } from './index';

describe('Shared Schemas', () => {
  describe('UserRoleSchema', () => {
    it('should validate valid roles', () => {
      expect(UserRoleSchema.parse('delegate')).toBe('delegate');
      expect(UserRoleSchema.parse('admin')).toBe('admin');
    });

    it('should reject invalid roles', () => {
      expect(() => UserRoleSchema.parse('guest')).toThrow();
    });
  });

  describe('UserSchema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'delegate',
        created_at: 1234567890,
      };
      expect(UserSchema.parse(validUser)).toEqual(validUser);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        id: 'user_123',
        email: 'not-an-email',
        name: 'Test User',
        role: 'delegate',
        created_at: 1234567890,
      };
      expect(() => UserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('ApiResponseSchema', () => {
    it('should validate a success response', () => {
      const successResponse = {
        success: true,
        data: { foo: 'bar' },
      };
      expect(ApiResponseSchema.parse(successResponse)).toEqual(successResponse);
    });

    it('should validate an error response', () => {
      const errorResponse = {
        success: false,
        error: 'Something went wrong',
        code: 'ERROR_CODE',
      };
      expect(ApiResponseSchema.parse(errorResponse)).toEqual(errorResponse);
    });
  });
});
