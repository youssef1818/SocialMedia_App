import { EventEmitter } from 'node:events';
import Mail  from 'nodemailer/lib/mailer';
import { sendEmail } from './../email/send.email';
import { emailTemplate } from './../email/verify.template.email';

export const emailEvent = new EventEmitter();
interface IEmail extends Mail.Options{
    otp:number;
}

emailEvent.on("confirmEmail", async (data:IEmail) => {
    try {
        data.subject = "Confirm your email";
        data.html = emailTemplate({otp:data.otp,title:"Email Confirmation"});
        await sendEmail(data);
    } catch (error) {
        console.log(`failed to send email to ${data.to}`, error);
    }
})

emailEvent.on("resetPassword", async (data:IEmail) => {
    try {
        data.subject = "Reset Account Password";
        data.html = emailTemplate({otp:data.otp,title:"Reset Code"});
        await sendEmail(data);
    } catch (error) {
        console.log(`failed to send email to ${data.to}`, error);
    }
})