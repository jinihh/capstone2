const applyGaussianBlur = (inputPath, outputPath, timelines, scale) => {
    return new Promise((resolve, reject) => {
      try {
        const filterGraph = timelines.flatMap(({ detected_object }) => {
          return detected_object.flatMap(({ bounding_box }) => {
            return bounding_box.map(({ frame, box }) => {
              const [x, y, width, height] = box.split(',').map(Number);
              return `if(eq(n,${frame}),crop=${width}:${height}:${x}:${y},boxblur=${scale})`;
            });
          });
        }).join(',');
  
        ffmpeg(inputPath)
          .complexFilter(filterGraph)
          .output(outputPath)
          .on('end', () => {
            console.log('비디오 블러 처리 완료:', outputPath);
            resolve({ success: true });
          })
          .on('error', (err) => {
            console.error('ffmpeg 처리 오류:', err);
            reject({ success: false, error: err });
          })
          .run();
      } catch (error) {
        console.error('applyGaussianBlur 함수 오류:', error);
        reject({ success: false, error });
      }
    });
  };
  
