module.exports = async (api, pkgData) => {
  if (pkgData) {
    api.extendPackage(pkgData, true);
  }
};
