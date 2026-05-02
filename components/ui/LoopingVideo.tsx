import { Colors } from '@/constants/theme';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

// YouTube video: https://www.youtube.com/watch?v=ZHhqwBwmRkI
// Clip: 2:54 (174s) → 3:49 (229s) — loops seamlessly
const VIDEO_ID = 'ZHhqwBwmRkI';
const START = 174;
const END   = 229;

const HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; background: #070b14; overflow: hidden; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  #player {
    position: fixed;
    top: 50%; left: 50%;
    width: 177.78vh;
    height: 100vh;
    min-width: 100vw;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  iframe { border: none; pointer-events: none; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  var player;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${VIDEO_ID}',
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        mute: 1,
        loop: 0,
        start: ${START},
        end: ${END},
        playsinline: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        disablekb: 1,
        autohide: 1,
      },
      events: {
        onReady: function(e) {
          e.target.setVolume(0);
          e.target.playVideo();
        },
        onStateChange: function(e) {
          // Loop: when ended or paused near end, seek back to start
          if (e.data === 0 || e.data === 2) {
            player.seekTo(${START}, true);
            player.playVideo();
          }
        }
      }
    });
  }

  // Safety: poll and loop every second in case onStateChange misses the end
  setInterval(function() {
    try {
      if (player && player.getCurrentTime) {
        var t = player.getCurrentTime();
        if (t >= ${END} - 0.5 || t < ${START} - 1) {
          player.seekTo(${START}, true);
          player.playVideo();
        }
      }
    } catch(e) {}
  }, 1000);
</script>
</body>
</html>
`;

type Props = { style?: ViewStyle };

export function LoopingVideo({ style }: Props) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <WebView
        source={{ html: HTML }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        pointerEvents="none"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.background,
    pointerEvents: 'none',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
    pointerEvents: 'none',
  },
});
