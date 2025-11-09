import {createTransport} from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { BadRequestException } from "../response/error.response";

export const sendEmail = async (data: Mail.Options) => {
    if(!data.html && !data.text && !data.attachments?.length){ 
        throw new BadRequestException("email content is required");
    }
    const transporter = createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const info = await transporter.sendMail({
        ...data,
        from: `Route ${process.env.APPLICATION_NAME} <${process.env.EMAIL_USER as string}>`,  
    });

    console.log("Message sent: ", info.messageId);

}

