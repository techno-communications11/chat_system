// Swagger API definition module.
import swaggerJSDoc from "swagger-jsdoc";
import { swaggerDefinition } from "./swagger.definition.js";

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
