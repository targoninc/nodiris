import sharp from 'sharp';
import {CLI} from "./CLI.mjs";

export class UserActions {
    static saveAvatar(db) {
        return async (req, res) => {
            if (!req.user) {
                res.status(401).send("Unauthorized");
                return;
            }
            const id = req.user.id;
            const {avatar} = req.body;
            const avatarBuffer = Buffer.from(avatar, 'base64');
            const sharpImage = sharp(avatarBuffer);
            const type = await sharpImage.metadata().then(info => info.format);
            if (!['jpg', 'png', 'gif'].includes(type)) {
                res.status(400).send("Invalid image format. Appropriate formats are {jpeg, png, gif}");
                return;
            }

            const processedImage = await sharpImage
                .resize(500, 500)
                .jpeg({quality: 50})
                .toBuffer();
            const newAvatar = processedImage.toString('base64');

            CLI.debug(`Saving avatar for user ${id}`);
            await db.saveAvatar(id, newAvatar);

            res.sendStatus(200);
        }
    }
}