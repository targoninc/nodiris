import sharp from 'sharp';

export class UserActions {
    static saveAvatar(db) {
        return async (req, res) => {
            const id = req.user.id;
            const {avatar} = req.body;
            const avatarBuffer = Buffer.from(avatar, 'base64');
            const type = await sharp(avatarBuffer).metadata().then(info => info.format);
            if (!['jpg', 'png', 'gif'].includes(type)) {
                res.status(400).send({message: "Invalid image format. Appropriate formats are {jpeg, png, gif}"});
                return;
            }

            const processedImage = await sharp(avatarBuffer)
                .resize(500, 500)
                .jpeg({quality: 50})
                .toBuffer();
            const newAvatar = processedImage.toString('base64');
            await db.saveAvatar(id, newAvatar);
            res.sendStatus(200);
        }
    }
}