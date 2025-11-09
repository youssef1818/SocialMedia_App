import { connect } from "mongoose"
import { UserModel } from "./model/User.model";


const connectDB = async (): Promise<void> => {
    try {
        const result = await connect(process.env.DB_URI as string, {
            serverSelectionTimeoutMS: 30000,
        });
        await UserModel.syncIndexes()
        console.log(result.model);
        console.log("DB connected ");  
    } catch (error) {
        console.log('failed to connect to DB');  
    }
}

export default connectDB;