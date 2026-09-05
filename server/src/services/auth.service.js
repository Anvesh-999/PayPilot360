const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const prisma = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  /**
   * Authenticate user and return tokens.
   */
  async login(email, password) {
    // Never reveal whether email exists — generic "Invalid credentials" for both cases
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store hashed refresh token in DB
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        employee: user.employee
          ? {
              id: user.employee.id,
              code: user.employee.employeeCode,
              employeeCode: user.employee.employeeCode,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              name: `${user.employee.firstName} ${user.employee.lastName}`,
              employmentStatus: user.employee.employmentStatus,
              department: user.employee.department ? { name: user.employee.department.name } : null,
              jobPosition: user.employee.jobPosition ? { title: user.employee.jobPosition.title } : null,
            }
          : null,
      },
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: true,
          employee: {
            include: {
              department: true,
              jobPosition: true,
            },
          },
        },
      });

      if (!user || user.refreshToken !== hashedRefresh) {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Rotate refresh token
      const newHashedRefresh = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newHashedRefresh },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role.name,
          employee: user.employee
            ? {
                id: user.employee.id,
                code: user.employee.employeeCode,
                employeeCode: user.employee.employeeCode,
                firstName: user.employee.firstName,
                lastName: user.employee.lastName,
                name: `${user.employee.firstName} ${user.employee.lastName}`,
                employmentStatus: user.employee.employmentStatus,
                department: user.employee.department ? { name: user.employee.department.name } : null,
                jobPosition: user.employee.jobPosition ? { title: user.employee.jobPosition.title } : null,
              }
            : null,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Get current user profile.
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        employee: {
          include: {
            department: true,
            jobPosition: true,
            workingSchedule: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      employee: user.employee,
      createdAt: user.createdAt,
    };
  }

  /**
   * Invalidate refresh token (logout).
   */
  async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /**
   * Hash a password for storage.
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  // ─── Private helpers ────────────────────────────────────

  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        roleName: user.role.name,
        employeeId: user.employee?.id || null,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }
}

module.exports = new AuthService();
