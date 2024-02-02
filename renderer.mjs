const { Application, Assets, Container, Sprite, filters } = PIXI;
const sourceAssetSize = { width: 640, height: 320 };
const outputOptions = {
    width: 280,
    height: 140,
    border: {
        color: 0xffffff,
        width: 10,
    },
};

const app = new Application();

app.init({
    width: outputOptions.width,
    height: outputOptions.height,
    backgroundColor: outputOptions.border.color,
    autoStart: false,
    preference: new URLSearchParams(location.search.slice(1)).get('preference') || 'webgl',
    hello: true,
}).then(() =>
{
    const frames = {};

    let index = -1;
    let preview;
    let bg;
    let fishes;
    let displacement;
    let lightmap;
    let colormap;
    let config;

    Assets.addBundle('assets', [
        { alias: 'previewBackground', src: './assets/preview_background.png' },
        { alias: 'previewFishes', src: './assets/preview_fishes.png' },
        { alias: 'lightmap', src: './assets/lightmap.png' },
        { alias: 'displacement', src: './assets/displacement.png' },
        { alias: 'colormap', src: './assets/colormap.png' },
        { alias: 'config', src: './config.json' }
    ]);

    // Load image
    Assets.loadBundle('assets').then((resources) =>
    {
        lightmap = resources.lightmap;
        colormap = resources.colormap;
        displacement = new Sprite(resources.displacement);
        config = resources.config;

        fishes = new Sprite(resources.previewFishes);
        bg = new Sprite(resources.previewBackground);

        fishes.scale.set(outputOptions.width / sourceAssetSize.width);
        bg.scale.set(outputOptions.width / sourceAssetSize.width);

        preview = new Container();
        preview.addChild(bg, fishes);

        app.stage.addChild(preview);
        next();
    });

    async function next()
    {
        const obj = config.images[++index];

        if (obj)
        {
            const FilterClass = filters[obj.name] || PIXI[obj.name];

            console.assert(!!FilterClass, `Filter ${obj.name} does not exist`);
            let filter;

            switch (obj.name)
            {
                case 'DisplacementFilter': {
                    filter = new FilterClass({ sprite: displacement, scale: 50 });
                    break;
                }
                case 'SimpleLightmapFilter': {
                    filter = new FilterClass({ lightMap: lightmap });
                    break;
                }
                case 'ColorMapFilter': {
                    filter = new FilterClass({ colorMap: colormap, nearest: false });
                    break;
                }
                default: {
                    const args = obj.arguments;

                    if (args)
                    {
                        filter = new FilterClass(args);
                    }
                    else
                    {
                        filter = new FilterClass();
                    }
                }
            }

            if (obj.options)
            {
                for (const i in obj.options)
                {
                    filter[i] = obj.options[i];
                }
            }

            // Call function
            if (obj.func && filter[obj.func])
            {
                filter[obj.func].apply(filter, obj.args);
            }

            // Render the filter
            fishes.filters = [];
            preview.filters = [];

            if (obj.fishOnly)
            {
                fishes.filters = [filter];
            }
            else
            {
                preview.filters = [filter];
            }

            if (obj.filename)
            {
                app.render();
                const base64 = await app.renderer.extract.base64(app.stage);
                const img = new Image();

                img.src = base64;
                document.body.appendChild(img);
            }
            else if (obj.frame)
            {
                app.render();
                const canvas = app.renderer.extract.canvas(app.stage);

                const canvas2 = document.createElement('canvas');
                canvas2.width = outputOptions.width;
                canvas2.height = outputOptions.height;
                document.body.appendChild(canvas2);
                const context = canvas2.getContext('2d');
                context.drawImage(canvas, 0, 0);
                context.scale(1, -1);
                const imageData = context.getImageData(0, 0, outputOptions.width, outputOptions.height);

                frames[obj.frame] = imageData.data;
            }

            // Wait for next stack to render next filter
            requestAnimationFrame(next);
        }
    }
});
