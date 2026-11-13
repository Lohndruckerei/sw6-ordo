<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Command;

use Lohndruckerei\Ordo\Service\OrderFileService;
use Shopware\Core\Checkout\Order\OrderCollection;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Legt fehlende Auftragsakten an (z. B. für Bestellungen vor der Installation oder nach einem Fehler).
 * Vorhandene Akten werden nur um neue Positionen ergänzt; Status bleiben unverändert.
 */
#[AsCommand(name: 'ordo:order:sync', description: 'Legt fehlende Ordo-Auftragsakten für vorhandene Bestellungen an')]
class OrderSyncCommand extends Command
{
    /**
     * @param EntityRepository<OrderCollection> $orderRepository
     */
    public function __construct(
        private readonly EntityRepository $orderRepository,
        private readonly OrderFileService $orderFileService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Höchstens so viele Bestellungen (neueste zuerst)', '500');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $context = Context::createCLIContext();
        $criteria = (new Criteria())
            ->addFilter(new EqualsFilter('versionId', Defaults::LIVE_VERSION))
            ->addSorting(new FieldSorting('orderDateTime', FieldSorting::DESCENDING))
            ->setLimit(max(1, (int) $input->getOption('limit')));

        $count = 0;
        foreach ($this->orderRepository->searchIds($criteria, $context)->getIds() as $orderId) {
            if ($this->orderFileService->ensure((string) $orderId, $context, 'sync') !== null) {
                ++$count;
            }
        }
        $output->writeln(\sprintf('%d Bestellungen geprüft, Auftragsakten angelegt bzw. ergänzt.', $count));

        return Command::SUCCESS;
    }
}
