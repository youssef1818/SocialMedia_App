import { CreateOptions, HydratedDocument, Model } from "mongoose";
import { IUser as TDocument } from "../model/User.model";
import { DatabaseRepository } from "./database.repository";
import { AppError } from "../../utils/response/error.response";

export class UserRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }

  async createUser({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TDocument>> {
    const [user] = (await this.create({ data, options })) || [];

    if (!user) {
      throw new AppError("failed to signup", 401);
    }

    return user;
  }

  

}
