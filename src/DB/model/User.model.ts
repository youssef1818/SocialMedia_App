import {
  model,
  models,
  Schema,
  Types,
  HydratedDocument,
  UpdateQuery,
} from "mongoose";
import { BadRequestException } from "../../utils/response/error.response";
import { TokenRepository } from "./../repository/token.repository";
import { TokenModel } from "./Token.model";
import { generateHash } from "./../../utils/security/hash.security";
import { emailEvent } from './../../utils/email/email.event';

export enum GenderEnum {
  male = "male",
  female = "female",
}

export enum RoleEnum {
  user = "user",
  admin = "admin",
  superAdmin = "super-admin",
}

export enum ProviderEnum {
  google = "google",
  system = "system",
}

export interface IUser {
  _id: Types.ObjectId;

  slug: string;

  firstName: string;
  lastName: string;
  username?: string;

  email: string;
  confirmEmailOtp?: string;
  confirmedAt?: Date;

  password: string;
  resetPasswordOtp?: string;
  changeCredentialsTime?: Date;

  profileImage?: string;
  tempProfileImage?: string;
  coverImages?: string[];

  phone?: string;
  address?: string;

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  createdAt: Date;
  updatedAt?: Date;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;

  restoredAt?: Date;
  restoredBy?: Types.ObjectId;

  friends?: Types.ObjectId[];

}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    slug: { type: String, required: true, minLength: 5, maxLength: 51 },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },

    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.google ? false : true;
      },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },

    freezedAt: Date,
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },

    restoredAt: Date,
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },

    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],

    profileImage: String,
    tempProfileImage: String,
    coverImages: [String],

    phone: { type: String },
    address: { type: String },

    gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.user },
    provider: {
      type: String,
      enum: ProviderEnum,
      default: ProviderEnum.system,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

userSchema.virtual("username").set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
  }).get(function () {
    return this.firstName + " " + this.lastName;
});

userSchema.pre("validate", function (next) {
  if (!this.slug?.includes("-")) {
    return next(new BadRequestException("Invalid username format"));
  }
  next();
});

userSchema.pre("save",async function (
    this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string },
    next
  ) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
      this.password = await generateHash(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
      this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
      this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }
    next();
  }
);

userSchema.post("save", async function (doc, next) {
  const that = this as HUserDocument & {
    wasNew: boolean;
    confirmEmailPlainOtp?: string;
  };
  if (that.wasNew && that.confirmEmailPlainOtp) {
    emailEvent.emit("confirmEmail", {
      to: this.email,
      otp: that.confirmEmailPlainOtp as string,
    });
  }

  next();
});

userSchema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
  const update = this.getUpdate() as UpdateQuery<HUserDocument>;

  if (update.freezedAt) {
    this.setUpdate({ ...update, changeCredentialsTime: new Date() });
  }
});

userSchema.post(["updateOne", "findOneAndUpdate"], async function (doc, next) {
  const query = this.getQuery();
  const update = this.getUpdate() as UpdateQuery<HUserDocument>;

  if (update["$set"].changeCredentialsTime) {
    const tokenModel = new TokenRepository(TokenModel);
    await tokenModel.deleteMany({ filter: { userId: query._id } });
  }
});

userSchema.pre(["find", "findOne"], function(next){
  const query = this.getQuery();
  if(query.paranoid === false){
    this.setQuery({...query});
  }else{
    this.setQuery({...query, freezedAt: {$exists:false}});
  }
  next();
});




export const UserModel = models.User || model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>;
