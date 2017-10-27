import web3 from '../web3'
import _ from 'lodash'

import { RECEIVE_EVENT } from '../constants/constants'

import { setDefaultStatus } from './status'

import DidTokenArtifacts from '../contracts/DIDToken.json'
import DistenseArtifacts from '../contracts/Distense.json'
import PullRequestsArtifacts from '../contracts/PullRequests.json'
import TasksArtifacts from '../contracts/Tasks.json'

const receiveNewContractEvent = event => ({
  type: RECEIVE_EVENT,
  event
})

export const getContractEvents = () => async dispatch => {
  const network = web3.version.network
  if (network) {
    console.log(`Connected network number ${network}`)
    const didTokenAddress = DidTokenArtifacts.networks[network].address
    const distenseAddress = DistenseArtifacts.networks[network].address
    const tasksAddress = TasksArtifacts.networks[network].address
    const pullRequestsAddress = PullRequestsArtifacts.networks[network].address

    const didTokenEvents = getContractEventsNamesAndHashs(DidTokenArtifacts)
    const didTokenFilter = web3.eth.filter({
      fromBlock: 0,
      toBlock: 'latest',
      address: didTokenAddress
    })

    didTokenFilter.watch((error, result) => {
      if (error) console.log(`didTokenFilter ${error}`)
      if (result) {
        const event = constructIssueDIDEvent('DIDToken', didTokenEvents, result)
        dispatch(receiveNewContractEvent(event))
        dispatch(setDefaultStatus())
      }
    })

    const tasksEvents = getContractEventsNamesAndHashs(TasksArtifacts)
    const tasksFilter = web3.eth.filter({
      fromBlock: 0,
      toBlock: 'latest',
      address: tasksAddress
    })

    tasksFilter.watch((error, result) => {
      if (error) console.log(`tasksFilter error: ${error}`)
      if (result) {
        const event = constructEvent('Tasks', tasksEvents, result)
        dispatch(receiveNewContractEvent(event))
        dispatch(setDefaultStatus())
      }
    })

    const distenseEvents = getContractEventsNamesAndHashs(DistenseArtifacts)
    const distenseFilter = web3.eth.filter({
      fromBlock: 0,
      toBlock: 'latest',
      address: distenseAddress
    })

    distenseFilter.watch((error, result) => {
      if (error) console.log(`distenseFilter error: ${error}`)
      if (result) {
        const event = constructEvent('Distense', distenseEvents, result)
        dispatch(receiveNewContractEvent(event))
        dispatch(setDefaultStatus())
      }
    })

    const pullRequestsFilter = web3.eth.filter({
      fromBlock: 0,
      toBlock: 'latest',
      address: pullRequestsAddress
    })

    const pullRequestsEvents = getContractEventsNamesAndHashs(
      PullRequestsArtifacts
    )
    pullRequestsFilter.watch((error, logEvent) => {
      if (error) console.log(`pullRequestsFilter error: ${error}`)
      if (logEvent) {
        //  Look up event name by hash from blockchain log
        const event = constructEvent(
          'PullRequests',
          pullRequestsEvents,
          logEvent
        )
        dispatch(receiveNewContractEvent(event))
        dispatch(setDefaultStatus())
      }
    })
  } else {
    console.log(`Not connected to an Ethereum network.  This is bad, very bad.`)
  }
}

/**
 *
 * @param artifacts
 * @returns {Array} of objects that contain the human-readable name and hash signature of each event
 * Basically this: https://ethereum.stackexchange.com/questions/1381/how-do-i-parse-the-transaction-receipt-log-with-web3-js?lq=1
 */
const getContractEventsNamesAndHashs = artifacts => {
  const contractEvents = []
  const abi = artifacts.abi
  for (let i = 0; i < abi.length; i++) {
    const item = abi[i]
    if (item.type !== 'event') continue
    const signature =
      item.name +
      '(' +
      item.inputs
        .map(function(input) {
          return input.type
        })
        .join(',') +
      ')'
    const eventHash = web3.sha3(signature)
    const event = {
      name: item.name,
      hash: eventHash
    }
    contractEvents.push(event)
  }
  return contractEvents
}

const constructEvent = (contract, contractEvents, result) => {
  const event = _.find(contractEvents, { hash: result.topics[0] })
  return {
    contract,
    data: result.data,
    name: event.name,
    title: event.name
      .split('Log')[1]
      .split(/(?=[A-Z])/)
      .join(' '),
    txHash: result.transactionHash
  }
}

const constructIssueDIDEvent = (contract, contractEvents, result) => {
  const event = _.find(contractEvents, { hash: result.topics[0] })
  // Strip leading 0x00000s that precede addresses in the response
  const recipient = result.topics[1].split(/0x0{24}/)[1].toUpperCase()
  return {
    contract,
    data: result.data,
    origName: event.name,
    title: `Issue DID to ${recipient}`,
    txHash: result.transactionHash // To view on explorers
  }
}