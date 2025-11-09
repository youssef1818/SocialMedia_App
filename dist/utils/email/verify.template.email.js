"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplate = void 0;
const emailTemplate = ({ otp, title, }) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            background-color: #f2f4f7;
            font-family: 'Roboto', sans-serif;
        }

        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border: 1px solid #d9e2ec;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .header {
            padding: 20px;
            background-color: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header img {
            height: 60px;
        }

        .header a {
            text-decoration: none;
            color: #4A90E2;
            font-weight: 600;
        }

        .hero {
            background-color: #4A90E2;
            text-align: center;
            padding: 30px 0;
        }

        .hero img {
            width: 60px;
            height: 60px;
        }

        .content {
            text-align: center;
            padding: 40px 20px;
        }

        .content h1 {
            color: #4A90E2;
            margin-bottom: 20px;
        }

        .content p {
            color: #5A5A5A;
            margin: 0 auto 30px auto;
            max-width: 440px;
        }

        .btn {
            background-color: #295d93ff;
            color: #ffffff;
            padding: 12px 28px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            transition: background 0.3s ease;
        }

        .btn:hover {
            background-color: #1e4e82ff;
        }

        .footer {
            text-align: center;
            padding: 30px 20px;
            background-color: #f9fafb;
        }

        .footer h3 {
            color: #333;
            margin-bottom: 15px;
        }

        .social-icons img {
            width: 38px;
            height: 38px;
            margin: 0 10px;
            border-radius: 50%;
            transition: transform 0.2s ease;
        }

        .social-icons img:hover {
            transform: scale(1.1);
        }

        @media (max-width: 620px) {
            .header, .content, .footer {
                padding: 15px;
            }

            .content p {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>

<div class="email-container">
    <div class="header">
        <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670702280/Group_35052_icaysu.png" alt="Logo">
        <a href="http://localhost:4200/#/" target="_blank">View in Website</a>
    </div>

    <div class="hero">
        <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703716/Screenshot_1100_yne3vo.png" alt="Confirmation Icon">
    </div>

    <div class="content">
        <h1>${title}</h1>
        <h2>${otp}</p>
    </div>

    <div class="footer">
        <h3>Stay Connected</h3>
        <div class="social-icons">
            <a href="${process.env.facebookLink}" target="_blank">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" alt="Facebook">
            </a>
            <a href="${process.env.instegram}" target="_blank">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" alt="Instagram">
            </a>
            <a href="${process.env.twitterLink}" target="_blank">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" alt="Twitter">
            </a>
        </div>
    </div>
</div>

            </body></html>`;
};
exports.emailTemplate = emailTemplate;
