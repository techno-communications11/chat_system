import dotenv from "dotenv";
dotenv.config();

const serverConfig={
    dbURL:process.env.SERVER_APP_DB_URI,
    secretKey :process.env.SERVER_SECRETS,
    saltNumber:process.env.SERVER_SALT_NUMBER
}

export default serverConfig;