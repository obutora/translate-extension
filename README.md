# Udemy字幕翻訳Chrome拡張機能

Groq AIを使用してUdemyのWebサイトで英語字幕をリアルタイムで日本語に翻訳するChrome拡張機能です。

## 機能

- Udemyの英語字幕をリアルタイムで日本語に翻訳
- Groq AIのLLMモデル（Llama-4-Scout-17b）を使用
- 翻訳結果のキャッシュ機能
- 翻訳のON/OFF切り替え
- APIキーの設定管理
- 使用統計の表示

## インストール方法

### 開発者モードでのインストール

1. このプロジェクトをクローンまたはダウンロード
2. Chrome ブラウザで `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. このプロジェクトのフォルダを選択

### アイコンファイルの準備

拡張機能を正常に動作させるため、以下のアイコンファイルが必要です：

- `icons/icon16.png` (16x16ピクセル)
- `icons/icon48.png` (48x48ピクセル) 
- `icons/icon128.png` (128x128ピクセル)

### 簡単なアイコン作成方法

1. オンラインアイコンジェネレーターを使用（例：favicon.io）
2. または以下のコマンドでプレースホルダーアイコンを作成：

```bash
# ImageMagickがインストールされている場合
convert -size 128x128 xc:#667eea -gravity center -pointsize 40 -fill white -annotate +0+0 "字" icons/icon128.png
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

## 設定

### Groq APIキーの取得

1. [Groq Console](https://console.groq.com/keys) にアクセス
2. アカウントを作成またはログイン
3. APIキーを生成
4. 拡張機能のポップアップからAPIキーを設定

## 使用方法

1. Udemyのコースページにアクセス
2. 英語字幕を有効にする
3. 拡張機能が自動的に字幕を検出し、翻訳を開始
4. 翻訳された日本語字幕が画面下部に表示される

## 技術仕様

- **Manifest Version**: 3
- **翻訳API**: Groq AI (meta-llama/llama-4-scout-17b-16e-instruct)
- **対象サイト**: *.udemy.com
- **ブラウザ**: Chrome (Manifest V3対応)

## ファイル構造

```
translate-extension/
├── manifest.json              # Chrome拡張機能の設定
├── src/
│   ├── background/
│   │   └── background.js      # Groq API呼び出し処理
│   ├── content/
│   │   └── contentScript.js   # 字幕監視・表示処理
│   └── popup/
│       ├── popup.html         # 設定画面UI
│       ├── popup.css          # スタイルシート
│       └── popup.js           # 設定画面ロジック
├── icons/
│   ├── icon16.png            # アイコン（16x16）
│   ├── icon48.png            # アイコン（48x48）
│   └── icon128.png           # アイコン（128x128）
└── README.md
```

## 開発

### 環境変数

開発時は `.env` ファイルにGroq APIキーを設定：

```
GROQ_KEY="your-groq-api-key-here"
```

### デバッグ

1. Chrome DevTools の Console でログを確認
2. 拡張機能の背景ページ: `chrome://extensions/` → 詳細 → 背景ページを調査
3. Content Script: ページのコンソールでログを確認

## トラブルシューティング

### 字幕が翻訳されない場合

1. APIキーが正しく設定されているか確認
2. 拡張機能が有効になっているか確認
3. Udemyページで英語字幕が表示されているか確認
4. ブラウザコンソールでエラーログを確認

### パフォーマンスの問題

- キャッシュクリア機能を使用
- 翻訳機能を一時的に無効にしてページをリロード

## ライセンス

MIT License

## 参考資料

- [Chrome Extensions Developer Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Groq API Documentation](https://console.groq.com/docs)
- [参考記事: DeepLのAPIを使ってUdemyの英語講座で日本語字幕を出したい](https://zenn.dev/pontata18/articles/65c9e47c79f43a)
