import passport from "passport";

export class AuthActions {
    static authorizeUser(db) {
        return async (req, res, next) => {
            const cleanUsername = req.body.username.toLowerCase();
            if (cleanUsername.length < 3) {
                return res.send({error: "Username must be at least 3 characters long"});
            }
            const existing = await db.getUserByUsername(cleanUsername);
            if (!existing) {
                res.send({error: "Invalid username or password"});
                return;
            }

            passport.authenticate("local", async (err, user) => {
                if (err) {
                    console.log(err);
                    return next(err);
                }
                if (!user) {
                    return res.send({error: "Invalid username or password"});
                }
                req.logIn(user, async function (err) {
                    if (err) {
                        return next(err);
                    }
                    const outUser = {
                        id: user.id,
                        username: user.username,
                        avatar: await db.getAvatar(user.id)
                    }
                    return res.send({
                        user: outUser
                    });
                });
            })(req, res, next);
        }
    }

    static logout() {
        return (req, res) => {
            req.logout(() => {
                const isHttps = req.headers['x-forwarded-proto'] === 'https';

                res.clearCookie('connect.sid', {
                    path: '/',
                    httpOnly: true,
                    secure: isHttps,
                    sameSite: 'none'
                });

                res.send({message: "User has been successfully logged out."});
            });
        }
    }

    static isAuthorized(db) {
        return async (req, res) => {
            if (req.isAuthenticated()) {
                const user = {
                    ...req.user,
                    avatar: await db.getAvatar(req.user.id)
                }
                res.send({ user });
                return;
            }
            res.send({});
        };
    }

    static checkAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
            req.requestId = Math.random().toString(36).substring(7);
            return next();
        }
        res.send({error: "Not authenticated"});
    }

    static authenticationEnabled = (isEnabled) => {
        return (req, res) => {
            if (isEnabled) {
                res.sendStatus(200);
            } else {
                res.sendStatus(418);
            }
        }
    }
}