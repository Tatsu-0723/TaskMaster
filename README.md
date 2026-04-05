# TASKMASTER PRO
> **Vimmerによる、Vimmerのための、サイバーパンク・タスク管理ツール**

ホームポジションから一歩も動かず、思考の速度でタスクを裁く。
Tauri + Rust + TypeScript で構築された、爆速・高機能なデスクトップアプリです。

## ✨ 特徴
- **Vim-Like Keybindings**: `j`/`k`での移動、`dd`での削除、`/`での検索など、直感的な操作。
- **DS Analytics**: 見積(Est)と実績(Act)の乖離率をサイバーパンクなダッシュボードで視覚化。
- **Local First**: 外部サーバーを介さず、指定したフォルダの `tasks.json` に直接保存。
- **Native Experience**: システムトレイ常駐、デスクトップ通知、CSVエクスポート対応。
- **Cyberpunk UI**: 集中力を高めるダークテーマとネオン発光エフェクト。

## 🛠 テックスタック
- **Backend**: Rust / Tauri v2
- **Frontend**: Vite / TypeScript / Tabulator
- **Architecture**: 
    - フロントエンドでイベントをキャッチし、RustのFS APIを通じてローカル保存。

## ⌨️ 主要ショートカット
- `/`: 検索ボックスにフォーカス
- `j` / `k`: アクティブ行の上下移動
- `Tab`: カテゴリ編集開始
- `Enter`: 備考（Notes）編集開始
- `Esc`: ノーマルモード（編集終了）
- `dd`: アクティブ行を削除
- `1`〜`4`: ステータス変更（ToDo / Working / Pending / Done）
- `Ctrl + S`: CSVエクスポート

## 📦 アプリをすぐに使いたい方へ（インストール）

ソースコードからビルドする必要はありません。以下の手順ですぐにアプリを導入できます。

1. このページ右側にある **[Releases]** セクションから、最新のインストーラー（`Task Master_x.x.x_x64_en-US.exe` など）をダウンロードします。
2. ダウンロードした `.exe` をダブルクリックしてインストールを実行してください。
3. デスクトップに作成されたショートカットから起動します。

> **💡 Tips（ローカルでビルドした方へ）**
> ご自身で `npm run tauri build` を実行した場合、完成した `.exe` ファイル（インストーラー）はプロジェクト内の以下の場所に生成されます。
> `src-tauri/target/release/bundle/nsis/`
