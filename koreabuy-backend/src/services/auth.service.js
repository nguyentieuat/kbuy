// services/auth.service.js

const UserModel = require("../models/user.model");
const UserAddressModel = require("../models/userAddress.model");

const { hashPassword, comparePassword } = require("../utils/password");

const { signToken } = require("../utils/jwt");
const { normalizePhone } = require("../utils/phone.util");

const AuthService = {
  async register(payload) {
    const { username, email, phone: rawPhone, password } = payload;
    const phone = normalizePhone(rawPhone);
    // validate
    if (!username || !password) {
      throw new Error("Thiếu thông tin");
    }

    if (!email && !phone) {
      throw new Error("Email hoặc SĐT là bắt buộc");
    }

    // duplicate check
    const [emailExist, usernameExist, phoneExist] = await Promise.all([
      email ? UserModel.findByEmail(email) : null,
      UserModel.findByUsername(username),
      phone ? UserModel.findByPhone(phone) : null,
    ]);

    if (emailExist) {
      throw new Error("Email đã tồn tại");
    }

    if (usernameExist) {
      throw new Error("Username đã tồn tại");
    }

    if (phoneExist) {
      throw new Error("Số điện thoại đã tồn tại");
    }

    // hash password
    const hashedPassword = await hashPassword(password);

    // create user
    const user = await UserModel.create({
      username,
      email: email ?? null,
      phone: phone ?? null,
      password: hashedPassword,
    });

    // token
    const token = signToken({
      userId: user.id,
    });

    return {
      token,
      user: sanitizeUser(user),
    };
  },

  async login(credential, password) {
    const user = await UserModel.findByCredential(credential);

    if (!user) {
      throw new Error("Tài khoản hoặc mật khẩu không đúng");
    }

    if (!user.is_active) {
      throw new Error("Tài khoản đã bị khóa");
    }

    const validPassword = await comparePassword(password, user.password);

    if (!validPassword) {
      throw new Error("Tài khoản hoặc mật khẩu không đúng");
    }

    await UserModel.update(user.id, {
      last_login_at: new Date(),
    });

    const token = signToken({
      userId: user.id,
    });

    return {
      token,
      user: sanitizeUser(user),
    };
  },

  async getMe(userId) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const rawAddresses = await UserAddressModel.findByUserId(userId);

    const addresses = rawAddresses.map((a) => ({
      ...a,

      province: {
        code: a.province_code,
        name: a.province,
      },

      ward: {
        code: a.ward_code,
        name: a.ward,
      },
    }));

    return {
      ...sanitizeUser(user),
      addresses,
      default_address: addresses.find((a) => a.is_default) || null,
    };
  },

  async updateProfile(userId, payload) {
    const { full_name, first_name, last_name, avatar_url } = payload;

    const updateData = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    return await UserModel.update(userId, updateData);
  },

  async changePassword(userId, currentPassword, newPassword) {
    if (newPassword.length < 6) {
      throw new Error("Mật khẩu mới tối thiểu 6 ký tự");
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("Không tìm thấy tài khoản");
    }

    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    const hashedPassword = await hashPassword(newPassword);

    await UserModel.update(userId, {
      password: hashedPassword,
      updated_at: new Date(),
    });

    return true;
  },
};

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: normalizePhone(user.phone),
    role: user.role,
    avatar_url: user.avatar_url,

    full_name: user.full_name,
    first_name: user.first_name,
    last_name: user.last_name,

    phone_verified: user.phone_verified ?? false,
    email_verified: user.email_verified ?? false,

     is_active: user.is_active ?? true,
  };
}

module.exports = AuthService;
