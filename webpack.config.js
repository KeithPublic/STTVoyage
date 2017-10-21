module.exports = {
    entry: "./app/index.tsx",
    output: {
        path: __dirname + "/www/scripts/",
        filename: "[name].js",
        publicPath: "scripts/",
    },
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
            },
            {
                test: /\.tsx?$/,
                use: ["ts-loader"]
            }
        ]
    }
};