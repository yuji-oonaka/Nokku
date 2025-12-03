<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    // ナビゲーションの表示名を変更
    protected static ?string $navigationLabel = 'ユーザー・アーティスト管理';

    // ★重要: 表示データの制限ロジック
    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        // 管理者(admin)はそのまま全件表示
        if (auth()->user()->role === 'admin') {
            return $query;
        }

        // アーティスト(artist)等は「自分自身のデータ」のみ表示
        // これで他人の個人情報や他のアーティスト一覧は見えなくなります
        return $query->where('id', auth()->id());
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // ▼▼▼ 既存の基本情報セクション ▼▼▼
                Forms\Components\Section::make('基本情報')
                    ->schema([
                        Forms\Components\TextInput::make('real_name')
                            ->label('本名')
                            ->maxLength(255),
                            
                        Forms\Components\TextInput::make('nickname')
                            ->label('アーティスト名 / ニックネーム')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('email')
                            ->email()
                            ->required()
                            ->maxLength(255),

                        Forms\Components\Select::make('role')
                            ->label('権限')
                            ->options([
                                'artist' => 'アーティスト (Artist)',
                                'admin'  => '管理者 (Admin)',
                                'user'   => '一般ユーザー (User)',
                            ])
                            ->required()
                            ->default('artist')
                            // ★追加: 管理者以外は変更不可（ロック）
                            ->disabled(fn () => auth()->user()->role !== 'admin')
                            // disabledでもデータ送信するために必須
                            ->dehydrated(),

                        Forms\Components\TextInput::make('password')
                            ->password()
                            ->dehydrated(fn ($state) => filled($state))
                            ->required(fn (string $context): bool => $context === 'create'),
                    ])->columns(2),

                // ▼▼▼ 追加: 住所・連絡先セクション ▼▼▼
                Forms\Components\Section::make('住所・連絡先')
                    ->schema([
                        Forms\Components\TextInput::make('phone_number')
                            ->label('電話番号')
                            ->tel()
                            ->maxLength(20),

                        Forms\Components\TextInput::make('postal_code')
                            ->label('郵便番号')
                            ->numeric()
                            ->maxLength(8),

                        Forms\Components\TextInput::make('prefecture')
                            ->label('都道府県')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('city')
                            ->label('市区町村')
                            ->maxLength(255),

                        Forms\Components\TextInput::make('address_line1')
                            ->label('番地など')
                            ->maxLength(255)
                            ->columnSpanFull(), // 横幅いっぱいに

                        Forms\Components\TextInput::make('address_line2')
                            ->label('建物名・部屋番号')
                            ->maxLength(255)
                            ->columnSpanFull(),
                    ])->columns(3), // 3列で表示
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('real_name')
                    ->label('本名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nickname')
                    ->label('アーティスト名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('email')
                    ->searchable(),

                // 権限を色分けして表示
                Tables\Columns\TextColumn::make('role')
                    ->label('権限')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'admin' => 'danger',   // 赤
                        'artist' => 'success', // 緑
                        'user' => 'gray',      // グレー
                        default => 'gray',
                    }),
            ])
            ->filters([
                // 権限で絞り込みできるようにする
                Tables\Filters\SelectFilter::make('role')
                    ->options([
                        'artist' => 'アーティスト',
                        'admin' => '管理者',
                        'user' => '一般ユーザー',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}