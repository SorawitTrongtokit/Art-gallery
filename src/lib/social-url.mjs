const platformHosts = {
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com"],
  instagram: ["instagram.com", "www.instagram.com"],
};

/** @param {"facebook" | "instagram"} platform @param {unknown} value */
export function getOfficialSocialUrl(platform, value) {
  if (typeof value !== "string" || !Object.hasOwn(platformHosts, platform)) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      platformHosts[platform].includes(url.hostname) &&
      !url.username && !url.password && !url.port && url.pathname !== "/"
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}
