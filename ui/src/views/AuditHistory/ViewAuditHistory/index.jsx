import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import { formatDistanceStrict } from 'date-fns';
import Spinner from '../../../components/Spinner';
import Dashboard from '../../../components/Dashboard';
import ErrorPanel from '../../../components/ErrorPanel';
import DataTable from '../../../components/DataTable';
import { getAuditHistory } from '../../../utils/client';
import { withAuth } from '../../../utils/Auth';
import { sortAuditHistory } from '../utils';

const useStyles = theme => ({
  cardContent: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  card: {
    marginBottom: theme.spacing(2),
  },
  tableCell: {
    whiteSpace: 'nowrap',
  },
  serialNumberCell: {
    width: '60px',
    minWidth: '60px',
    maxWidth: '60px',
    whiteSpace: 'nowrap',
  },
});

@withStyles(useStyles)
@withAuth
export default class ViewAuditHistory extends Component {
  state = {
    auditHistory: null,
    loading: true,
    error: null,
    sortBy: 'created',
    sortDirection: 'desc',
  };

  async componentDidMount() {
    await this.loadAuditHistory();
  }

  loadAuditHistory = async () => {
    const { entityType, entityId } = this.props.match.params;
    const { user } = this.props;

    try {
      const response = await getAuditHistory(
        decodeURIComponent(entityId),
        entityType,
        user,
        {
          limit: '999',
        }
      );

      this.setState({
        auditHistory: response.auditHistory,
        loading: false,
      });
    } catch (error) {
      this.setState({
        error,
        loading: false,
      });
    }
  };

  handleHeaderClick = header => {
    if (header.id === 'serial_no') {
      return;
    }

    const { sortBy, sortDirection } = this.state;
    const nextSortDirection =
      sortBy === header.id && sortDirection === 'desc' ? 'asc' : 'desc';

    this.setState({
      sortBy: header.id,
      sortDirection: nextSortDirection,
    });
  };

  render() {
    const { auditHistory, loading, error, sortBy, sortDirection } = this.state;
    const { classes, match } = this.props;
    const { entityId } = match.params;
    const sortedAuditHistory = sortAuditHistory(
      auditHistory,
      sortBy,
      sortDirection
    );
    const headers = [
      { id: 'serial_no', label: 'S.No.' },
      { id: 'actionType', label: 'Action Type' },
      { id: 'clientId', label: 'Client ID' },
      { id: 'created', label: 'Created' },
    ];

    return (
      <Dashboard title={`Audit History - ${decodeURIComponent(entityId)}`}>
        {loading && <Spinner loading />}
        <ErrorPanel error={error} />
        {auditHistory && (
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <DataTable
                items={sortedAuditHistory}
                headers={headers}
                sortByLabel={sortBy}
                sortDirection={sortDirection}
                onHeaderClick={this.handleHeaderClick}
                renderRow={(entry, index) => (
                  <TableRow key={entry.created}>
                    <TableCell className={classes.serialNumberCell}>
                      {index + 1}
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      {entry.actionType}
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      {entry.clientId}
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      {formatDistanceStrict(
                        new Date(entry.created),
                        new Date()
                      )}{' '}
                      ago
                    </TableCell>
                  </TableRow>
                )}
              />
            </CardContent>
          </Card>
        )}
      </Dashboard>
    );
  }
}
