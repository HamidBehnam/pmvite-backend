import jwt from "express-jwt";
import JwksRsa from "jwks-rsa";
import jwtAuthz from "express-jwt-authz";
import {configService} from "../services/config.service";

class AuthMiddleware {
    private _checkJwt?: jwt.RequestHandler;

    constructor() {
    }

    get checkJwt(): jwt.RequestHandler {
        this._checkJwt = this._checkJwt || jwt({
            secret: JwksRsa.expressJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${configService.auth0_domain}/.well-known/jwks.json`
            }),
            audience: configService.auth0_audience,
            issuer: `https://${configService.auth0_domain}/`,
            algorithms: ['RS256']
        });

        return this._checkJwt;
    }

    checkAuth0Permissions(permissions: string[]) {
        // In the critical cases which we can't afford to have an outdated role from the token (for instance having
        // an outdated role in a token which is not expired yet), we can directly
        // get the user's role through the Auth0 management api instead.
        return jwtAuthz(permissions, {
            customScopeKey: "permissions",
            checkAllScopes: true
        });
    }
}

export const authMiddleware = new AuthMiddleware();
