<?php

namespace App\Filament\Resources\GachaResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class ItemsRelationManager extends RelationManager
{
    // Gacha モデルで定義されているリレーション名
    protected static string $relationship = 'items';
    protected static ?string $title = '排出アイテム設定';

    public function form(Form $form): Form
    {
        return $form->schema([
            // ★ 修正：モデルのカラム名「profile_item_id」とリレーション名「profileItem」に合わせる
            Forms\Components\Select::make('profile_item_id')
                ->label('排出アイテム選択')
                ->relationship('profileItem', 'name') // ProfileItem モデルの名前を表示
                ->required()
                ->searchable()
                ->preload()
                ->helperText('素材（アイコン）管理に登録されているアイテムから選択します'),

            // ★ 修正：モデルのカラム名「probability_weight」に合わせる
            Forms\Components\TextInput::make('probability_weight')
                ->label('排出の重み')
                ->numeric()
                ->default(1)
                ->helperText('数値が高いほど当たりやすくなります')
                ->required(),

            Forms\Components\Toggle::make('is_pickup')
                ->label('ピックアップ設定')
                ->default(false),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                // 修正：画像カラム
                Tables\Columns\ImageColumn::make('profileItem.image_url')
                    ->label('画像')
                    ->disk('public'),

                Tables\Columns\TextColumn::make('profileItem.name')
                    ->label('アイテム名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('probability_weight')
                    ->label('重み')
                    ->sortable()
                    ->badge()
                    ->color('info'),

                // 修正：PUを見やすく（チェックマークではなくバッジ形式）
                Tables\Columns\IconColumn::make('is_pickup')
                    ->label('PU')
                    ->boolean()
                    ->trueIcon('heroicon-o-star') // PUなら星アイコン
                    ->trueColor('warning')
                    ->falseIcon('heroicon-o-x-mark')
                    ->falseColor('gray'),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('排出アイテムを追加'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()->label('解除'),
            ]);
    }
}
