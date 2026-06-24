import serverConfig from '../config/server.config.js';
import jwt from "jsonwebtoken";
const checkAuth = (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - No Token Provided",
            });
        }
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Token Format Invalid",
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, serverConfig.secretKey);
        req.authToken = token;
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid Token",
            data: error.message
        });
    }
}
export default checkAuth;
