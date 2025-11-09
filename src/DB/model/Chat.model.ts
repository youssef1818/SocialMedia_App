import { Schema, Types, model, models, HydratedDocument } from "mongoose";

export interface IMessage {
  content: string;
  createdBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export type HMessageDocument = HydratedDocument<IMessage>;

export interface IChat {
  // ----------------OVO Chat-------------
  participants: Types.ObjectId[];
  messages: IMessage[];

  // ----------------OVM Chat-------------
  group?: string;
  group_image?: string;
  roomId?: string;

  // ----------------common-------------
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type HChatDocument = HydratedDocument<IChat>;

const messageSchema = new Schema<IMessage>(
  {
    content: { type: String, minlength: 2, maxlength: 500000, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const ChatSchema = new Schema<IChat>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    group: { type: String },
    group_image: { type: String },
    roomId: {
      type: String,
      required: function () {
        return this.createdBy ? true : false;
      },
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

export const ChatModel = models.Chat || model<IChat>("Chat", ChatSchema);
