import Site from "../models/site";
import { getUser } from "./auth";

const getUserSites = async (req, res, next) => {
    let user = await getUser();

    let sites = await Site.find({
        user,
    }).select("-auth -user");

    res.json(sites);
}

export { getUserSites };
