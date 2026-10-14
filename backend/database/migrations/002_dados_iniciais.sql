-- =====================================================================
-- Migração 002 - Dados iniciais (conteúdo do Trabalho Individual I)
-- Ilhas, chefes e conquistas que antes estavam fixos no HTML.
-- Nenhum usuário é criado aqui: o administrador é criado pelo comando
-- "npm run criar-admin", com credenciais lidas do arquivo .env.
-- =====================================================================

INSERT INTO ilhas (nome, ordem) VALUES
    ('Ilha 1', 1),
    ('Ilha 2', 2),
    ('Ilha 3', 3),
    ('Inkwell Hell', 4);

INSERT INTO chefes (nome, fase, ilha_id, estrategia, dificuldade)
SELECT v.nome, v.fase, i.id, v.estrategia, v.dificuldade
FROM (VALUES
    ('The Root Pack', 'Botanic Panic', 'Ilha 1',
     'O FSM transita de forma linear: Batata (projéteis horizontais), Cebola (gotas verticais baseadas na sua posição) e Cenoura (raios teleguiados). Fique sempre no fundo da tela.', 1),
    ('Goopy Le Grande', 'Ruse of an Ooze', 'Ilha 1',
     'IA baseada em saltos que calculam a distância do jogador. Use o Smoke Dash pouco antes dele pousar. Na fase do túmulo, corra sem parar de um lado ao outro.', 1),
    ('Hilda Berg', 'Threatenin'' Zeppelin', 'Ilha 1',
     'Batalha aérea. As transformações do zodíaco mudam a IA. Touro (avanço horizontal rápido), Gêmeos (bola de fogo circular), Arqueiro (estrelas teleguiadas).', 2),
    ('Cagney Carnation', 'Floral Fury', 'Ilha 1',
     'Fique apenas nas plataformas voadoras. O ataque de alongamento é telegrafado; caia para o chão assim que ele retrair o rosto.', 3),
    ('Ribby and Croaks', 'Clip Joint Calamity', 'Ilha 1',
     'Na última fase (Caça-níqueis), o ataque depende das moedas roladas. Dê parry na manivela rosa o mais rápido possível para iniciar a fase de dano.', 2),
    ('Baroness Von Bon Bon', 'Sugarland Shimmy', 'Ilha 2',
     'Você enfrentará 3 de 5 lacaios aleatórios. Arma Chaser é excelente para focar nos capangas enquanto desvia da Baronesa correndo com o castelo.', 3),
    ('Beppi The Clown', 'Carnival Kerfuffle', 'Ilha 2',
     'A montanha-russa corta a tela periodicamente. Guarde o Super Art para quando ele virar o carrossel gigante na fase final.', 3),
    ('Djimmi The Great', 'Pyramid Peril', 'Ilha 2',
     'Na fase das marionetes e pilares escaneando, minimize seu avião para ganhar agilidade extra. Use a bomba primária para causar dano por cima.', 3),
    ('Grim Matchstick', 'Fiery Frolic', 'Ilha 2',
     'Arma Lobber brilha aqui. Evite dar parry ou atirar nas bolas de fogo da fase final, pois elas explodem e se dividem, impossibilitando a esquiva.', 4),
    ('Wally Warbles', 'Aviary Action', 'Ilha 2',
     'Na fase do filho, mantenha-se girando em círculos ao redor dele. Quando Wally voltar de maca, jogue bombas na boca do pássaro sempre que abrir.', 4),
    ('Rumor Honeybottoms', 'Honeycomb Herald', 'Ilha 3',
     'A tela rola verticalmente. Equipe a arma Spread para dar dano massivo de perto quando ela descer para o centro da tela fingindo ler o livro.', 4),
    ('Captain Brineybeard', 'Shootin N'' Lootin', 'Ilha 3',
     'Sempre observe o navio ao fundo, não apenas o pirata. O barco chupa o ar e cospe raios mortais; use o agachamento para desviar do raio do laser.', 3),
    ('Sally Stageplay', 'Dramatic Fanatic', 'Ilha 3',
     'Seus padrões são lentos e fáceis de ler (diagonais e quedas do céu). Use o Smoke Bomb para atravessar por ela sem se preocupar com a caixa de colisão.', 3),
    ('Werner Werman', 'Murine Corps', 'Ilha 3',
     'Ataques predominantemente terrestres. Equipe o dash que dá invencibilidade. Na fase final (gato), observe os destroços caindo do teto.', 3),
    ('Dr. Kahl''s Robot', 'Junkyard Jive', 'Ilha 3',
     'Foco na antena inferior primeiro! Assim os drones param de poluir a tela. Na fase do coração, guarde a barra cheia de especial para pular de fase.', 4),
    ('Cala Maria', 'High Seas Hi-Jinx', 'Ilha 3',
     'Padrão de petrificação. Mantenha os dedos rápidos para balançar o direcional e quebrar o gelo. Voe rente às bordas da tela para desviar das cobras.', 4),
    ('Phantom Express', 'Railroad Wrath', 'Ilha 3',
     'Batalha sobre o carrinho. Evite usar armas que atiram automaticamente (como a Chaser), pois elas vão acertar as válvulas rosas e mover seu carrinho sem querer.', 4),
    ('King Dice', 'All Bets Are Off!', 'Inkwell Hell',
     'A IA exige Parry preciso no dado. Aprenda a mirar nos números 2 (Fichas), 5 (Coelho) e 8 (Bola 8) para enfrentar os mini-chefes mais fáceis. Atrás das mãos no centro há um ponto seguro.', 5),
    ('The Devil', 'One Hell of a Time', 'Inkwell Hell',
     'Fase 1: Leia os olhos dele (cabra, aranha, dragão). Fase 2 em diante: Use a arma Spread e desça para a plataforma inferior. Fique exatamente no meio da tela na última fase para não errar a queda.', 5)
) AS v (nome, fase, ilha, estrategia, dificuldade)
JOIN ilhas i ON i.nome = v.ilha;

INSERT INTO conquistas (nome, descricao, ordem) VALUES
    ('Taking Names', 'Derrote um chefão.', 1),
    ('A Walk in the Park', 'Derrote todos os chefes da Ilha 1.', 2),
    ('A Day at the Fair', 'Derrote todos os chefes da Ilha 2.', 3),
    ('A Trip Downtown', 'Derrote todos os chefes da Ilha 3.', 4),
    ('Casino Night', 'Conclua o Cassino do King Dice.', 5),
    ('Put On a Show', 'Consiga um Rank S.', 6),
    ('Sheriff', 'Obtenha Rank A ou mais em todos os chefes da Ilha 1.', 7),
    ('Boss', 'Obtenha Rank A ou mais em todos os chefes da Ilha 2.', 8),
    ('Mayor', 'Obtenha Rank A ou mais em todos os chefes da Ilha 3.', 9),
    ('Magician', 'Obtenha todas as Super Artes.', 10),
    ('King', 'Compre todos os itens da loja do Porkrind.', 11),
    ('Souls Saved', 'Termine o jogo no modo Normal.', 12),
    ('Beat The Devil At His Own Game', 'Termine o jogo no modo Expert.', 13),
    ('Butter-and-Egg Man', 'Compre tudo na loja.', 14),
    ('Ceramic Strike', 'Derrote um chefe com o Ataque EX.', 15),
    ('Porcelain Power', 'Derrote um chefe com um Super Art.', 16),
    ('Magician Lord', 'Consiga todas as Super Artes.', 17),
    ('Perfect Run', 'Complete uma fase sem tomar dano.', 18),
    ('Coffers Full', 'Pegue todas as moedas nas fases Run ''n Gun.', 19),
    ('Bouncing Ball', 'Dê 5 parrys seguidos antes de tocar o chão.', 20),
    ('Parry Persuasion', 'Faça 20 parrys em um chefe.', 21),
    ('Parry Performance', 'Faça 100 parrys no total.', 22),
    ('Pacifist', 'Complete todos os níveis Run ''n Gun sem atirar/matar.', 23),
    ('Rolling Sixes', 'Derrote o King Dice sem sofrer dano.', 24),
    ('Bravo Zulu P-26', 'Derrote um chefe usando apenas balas pequenas de avião.', 25),
    ('Cutting Corners', 'Descubra um atalho secreto no mapa do mundo.', 26),
    ('High Roller', 'Obtenha todas as moedas no jogo.', 27),
    ('Selling Out', 'Faça o acordo final com o Diabo (Bad Ending).', 28);
