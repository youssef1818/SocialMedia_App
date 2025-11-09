import { DatabaseRepository, Lean } from "./database.repository";
import { IChat as TDocument } from "../model/Chat.model";
import { HydratedDocument, Model, PopulateOptions, ProjectionType, QueryOptions } from "mongoose";
import { RootFilterQuery } from "mongoose";

export class ChatRepository extends DatabaseRepository<TDocument>{
    constructor(protected override readonly model:Model<TDocument>){
        super(model)
    }

    
  async findOneChat({
    filter,
    select,
    options,
    page=1,
    size=5,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
    page?: number | undefined;
    size?: number | undefined;
  }): Promise<
    | HydratedDocument<TDocument>
    | null
    |Lean<TDocument>
  > {
    page = Math.floor(!page || page < 1 ? 1 : page);
    size = Math.floor(!size || size < 1 ? 5 : size);

    const doc = this.model.findOne(filter, {
        messages: {$slice: [ -(page * size) , size ]}
    });
    if (options?.lean) {
      doc.lean(options.lean);
    }
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }
    if (options?.limit) {
      doc.limit(options.limit);
    }
    if (options?.skip) {
      doc.skip(options.skip);
    }
    return await doc.exec();
  }

}